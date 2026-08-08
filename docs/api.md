# API & Extension Contracts

**Produk:** Caraka · **Versi:** 1.0 · **Tanggal:** 7 Agustus 2026

Kontrak yang dilihat kontributor. Arsitektur lengkapnya di `design.md`; dokumen ini fokus pada permukaan yang perlu diimplementasikan orang lain.

Tiga permukaan ekstensi, dan hanya tiga. Tidak ada plugin runtime, tidak ada dynamic loading, tidak ada marketplace.

---

## 1. Preset agent

Menambah dukungan agent baru adalah satu berkas YAML di `presets/agents/`. Kalau butuh kode inti, abstraksinya salah — dan sejak v0.4 ada test yang menjaganya: `one dummy preset YAML drives a full turn to the channel through the CLI driver` di `test/e2e.test.ts`.

```yaml
# presets/agents/codex.yaml — berkas yang benar-benar dikirim v0.4
id: codex
driver: cli
command: codex
args: ["exec", "--json", "--color", "never", "--sandbox", "read-only", "--skip-git-repo-check"]
resumeArgs: ["exec", "resume", "{sessionId}", "--color", "never", "--sandbox", "read-only"]
output: jsonl
resumeOutput: text
sessionIdFields: ["thread_id", "session_id"]
```

Skema Zod-nya (`src/drivers/preset.ts`) memuat persis field yang dibaca loader dan kedua driver:

| Field | Tipe | Arti |
|---|---|---|
| `id` | string | unik, dipakai di `/switch <id>` |
| `driver` | `acp` \| `cli` \| `mcp` | jalur yang dipakai |
| `command` | string | biner jalur CLI; dicari di `PATH`, path absolut juga sah |
| `args[]` | string[] | argumen giliran pertama. `{sessionId}` disubstitusi |
| `resumeArgs[]` | string[] | argumen giliran lanjutan |
| `input` | `arg` \| `stdin` | cara prompt dikirim. Default `arg` |
| `maxPromptArgChars` | number | di atas ini, prompt pindah ke stdin |
| `output` | `json` \| `jsonl` \| `text` | format keluaran giliran pertama |
| `resumeOutput` | sama | format giliran lanjutan bila berbeda |
| `sessionIdFields[]` | string[] | kunci yang dibaca untuk menemukan id sesi |
| `env` | map | env tambahan untuk proses agent |
| `acp` | `{command, args[], env}` | spawn adapter ACP; `command` di-resolve terhadap `PATH` plus `node_modules/.bin` paket |

Dua amandemen 8 Agustus 2026 (pekerjaan `driver-v04`) membentuk tabel ini. Pertama, blok `acp:` masuk: tabel lama hanya mengenal field jalur CLI, padahal spawn ACP dikeraskan di kode driver — dan `{command, args, env}` terbukti cukup, vscode-acp berbicara ke sembilan agent berbeda hanya dengan tiga field itu per agent. Satu preset boleh memuat kedua jalur; pemilihan otomatis jatuh dari ACP ke CLI (FR-DRV-07). Kedua, field `sessionMode`, `systemPromptArg`, `systemPromptWhen`, `modelArg`/`modelAliases`, `imageArg`/`imageMode`, dan `serialize` keluar dari tabel: belum ada satu pun pembacanya di `src/`, dan skema yang menerima field tanpa pembaca menjanjikan perilaku yang tidak ada. Masing-masing kembali saat ada driver yang membacanya.

**Menerima preset baru** butuh tiga hal: perintahnya sudah diuji sendiri oleh pengirim, agent-nya berjalan non-interaktif dan kembali saat selesai, dan flag yang belum diuji ditandai `# belum diverifikasi` beserta sumbernya di dalam berkas. Job `presets` di CI menjaga skemanya; smoke hidup tetap per mesin.

---

## 2. MCP inbox (agent di dalam IDE)

Untuk agent yang tidak bisa di-spawn, Caraka membalik arah: kita menjadi MCP server, agent yang menarik pesan.

```
Chat → Gateway → antrean (SQLite)
                      ↑ inbox_pull
              MCP server "caraka"
                      ↓ reply · ask · status
        Cline · Kilo · Windsurf · Kiro · Antigravity
```

### `inbox_pull`

```json
{ "name": "inbox_pull",
  "inputSchema": { "type": "object", "properties": {
    "workspace": { "type": "string" },
    "limit": { "type": "integer", "default": 10 } } } }
```

Mengembalikan pesan yang belum diproses dan menandainya terambil.

```json
{ "messages": [
  { "id": "msg_01J...", "session_id": "a91", "workspace": "toko-api",
    "text": "kenapa checkout 500 di staging?",
    "attachments": [{ "kind": "image", "path": "/tmp/caraka/x.png", "mime": "image/png" }],
    "ts": 1786100000000 } ] }
```

### `reply`

```json
{ "session_id": "a91", "text": "Ketemu. PaymentService.charge() melempar saat idempotency_key null.",
  "media": ["/tmp/caraka/diff.patch"] }
```

Konvensi lampiran mengikuti gateway: baris `MEDIA:<path>` yang berdiri sendiri di dalam `text` juga diekstrak dan dikirim sebagai lampiran.

### `ask`

```json
{ "session_id": "a91", "question": "Terapkan perbaikan ini?",
  "options": [{ "id": "yes", "label": "✅ Terapkan" }, { "id": "no", "label": "❌ Batal" }],
  "risk": "high" }
```

Memblokir sampai user memilih, timeout 10 menit. Mengembalikan `{ "choice": "yes", "decided_by": "principal_01J..." }`.

`ask` melewati jalur approval yang sama dengan ACP: nonce sekali pakai, TTL, terikat pada principal pemilik sesi. Jawaban tidak pernah bisa datang dari teks chat.

### `status`

```json
{ "session_id": "a91", "state": "running", "detail": "membaca src/checkout/*.ts" }
```

`state` salah satu dari `running`, `awaiting`, `done`, `failed`, `cancelled`. Memperbarui pesan status hidup dan warna ikon topic.

**Trade-off yang dikomunikasikan terbuka:** agent harus diminta memanggil `inbox_pull`, biasanya lewat satu baris di rules file-nya. Ini bukan "selalu nyala" seperti jalur ACP, dan onboarding mengatakannya.

---

## 3. Memory provider

```ts
interface MemoryProvider {
  observe(e: { scope: Scope; kind: string; text: string; meta?: object }): Promise<string>;
  compile(q: { scope: Scope; task: string; budgetTokens: number }): Promise<CompiledContext>;
  feedback(contextId: string, outcome: Outcome): Promise<void>;
  trace(claimId: string): Promise<Evidence[]>;
  forget(idOrFilter: string | Filter): Promise<number>;
}

type Scope = { kind: "workspace" | "user"; id: string };
type CompiledContext = { id: string; items: { text: string; source: string }[]; tokensUsed: number };
type Outcome = { ok: boolean; note?: string };
```

Dua aturan yang mengikat implementasi mana pun:

**`compile` wajib menghormati `budgetTokens`.** Memori yang melebihi anggaran merusak konteks agent alih-alih membantunya.

**Kegagalan tidak pernah memblokir balasan.** Timeout 500 ms lalu lanjut tanpa memori, catat `memory_degraded`.

Konten yang dikembalikan disuntik ke prompt dengan penanda data, bukan instruksi.

---

## 4. Channel

Menambah channel berarti mengimplementasikan satu interface dan mendeklarasikan kemampuan dengan jujur.

```ts
interface Channel {
  readonly id: ChannelId;
  readonly caps: {
    buttons: boolean; edit: boolean; files: boolean; typing: boolean;
    threads: boolean; rich: boolean; ephemeral: boolean; maxChars: number;
  };
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(cb: (m: InboundMessage) => void): void;
  onChoice(cb: (c: ChoiceCallback) => void): void;
  send(chatId: string, m: OutboundMessage): Promise<MessageRef>;

  createThread?(chatId: string, t: ThreadSpec): Promise<ThreadRef>;
  editThread?(ref: ThreadRef, t: Partial<ThreadSpec>): Promise<void>;
  closeThread?(ref: ThreadRef): Promise<void>;
  deleteThread?(ref: ThreadRef): Promise<void>;
}
```

**Aturan yang paling sering dilanggar kontributor:** core tidak pernah bercabang berdasarkan `channel.id`. Ia membaca `caps` dan menurunkan kualitas. Menambahkan `if (channel.id === "telegram")` ke core adalah kesalahan desain, bukan jalan pintas.

Mendeklarasikan `caps` yang tidak dimiliki lebih buruk daripada mendeklarasikan sedikit: fallback anggun hanya bekerja kalau deklarasinya jujur.

---

## 5. Bentuk internal

Diimplementasikan driver, tidak untuk diperluas dari luar. Bagian ini dulu menggambar delta `text`/`thought`/`tool`/`diff`/`plan` dan sebuah `PermissionRequest` ber-`action` dan `risk`; gateway tidak pernah membaca bentuk itu. Sejak 8 Agustus 2026 (pekerjaan `driver-v04`) tipe ini milik `src/core/driver.ts`, dinamai dari permukaan yang benar-benar dibaca:

```ts
type AgentUpdate = {
  sessionId: string;
  update:
    | { sessionUpdate: "agent_message_chunk"; content: { type: string; text: string } }
    | { sessionUpdate: "available_commands_update"; availableCommands: AgentCommand[] }
    | { sessionUpdate: "usage_update"; used: number; size: number;
        cost?: { amount: number | string; currency: string } | null }
    | { sessionUpdate: "tool_call"; toolCallId: string; title: string };
};

type PermissionRequest = {
  sessionId: string;
  toolCall: {
    toolCallId: string; title?: string | null; kind?: string | null;
    rawInput?: unknown; locations?: Array<{ path: string }> | null;
  };
  options: Array<{ optionId: string; name: string; kind: string }>;
};
```

Bentuknya subset wire ACP: driver ACP meneruskannya apa adanya tanpa terjemahan, driver CLI memfabrikasi satu `agent_message_chunk` per giliran. Jalur CLI karena itu tanpa streaming, dan `/commands` serta `/usage` di jalur itu terdegradasi ke jawaban kosong — update-nya tidak pernah datang.
