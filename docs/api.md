# API & Extension Contracts

**Produk:** Caraka · **Versi:** 1.0 · **Tanggal:** 7 Agustus 2026

Kontrak yang dilihat kontributor. Arsitektur lengkapnya di `design.md`; dokumen ini fokus pada permukaan yang perlu diimplementasikan orang lain.

Tiga permukaan ekstensi, dan hanya tiga. Tidak ada plugin runtime, tidak ada dynamic loading, tidak ada marketplace.

---

## 1. Preset agent (jalur CLI)

Menambah dukungan agent baru pada jalur CLI adalah satu berkas YAML di `presets/agents/`. Kalau butuh kode inti, abstraksinya salah.

```yaml
# presets/agents/codex.yaml
id: codex
driver: cli
command: codex
args: ["exec", "--json", "--color", "never", "--sandbox", "read-only", "--skip-git-repo-check"]
resumeArgs: ["exec", "resume", "{sessionId}", "--color", "never", "--sandbox", "read-only"]
output: jsonl
resumeOutput: text
sessionIdFields: ["thread_id", "session_id"]
sessionMode: existing
modelArg: "--model"
imageArg: "--image"
```

| Field | Tipe | Arti |
|---|---|---|
| `id` | string | unik, dipakai di `/switch <id>` |
| `driver` | `acp` \| `cli` \| `mcp` | jalur yang dipakai |
| `command` | string | biner yang dicari di `PATH` |
| `args[]` | string[] | argumen giliran pertama. `{sessionId}` disubstitusi |
| `resumeArgs[]` | string[] | argumen giliran lanjutan |
| `input` | `arg` \| `stdin` | cara prompt dikirim. Default `arg` |
| `maxPromptArgChars` | number | di atas ini, prompt pindah ke stdin |
| `output` | `json` \| `jsonl` \| `text` | format keluaran giliran pertama |
| `resumeOutput` | sama | format giliran lanjutan bila berbeda |
| `sessionMode` | `always` \| `existing` \| `none` | kapan id sesi dikirim |
| `sessionIdFields[]` | string[] | kunci yang dibaca untuk menemukan id sesi |
| `systemPromptArg` | string | flag untuk menyisipkan system prompt |
| `systemPromptWhen` | `first` \| `always` | kapan dikirim |
| `modelArg` · `modelAliases` | string · map | pemilihan model |
| `imageArg` · `imageMode` | string · `repeat` \| `join` | lampiran gambar |
| `serialize` | boolean | paksa satu proses pada satu waktu |

**Menerima preset baru** butuh tiga hal: perintahnya sudah diuji sendiri oleh pengirim, agent-nya berjalan non-interaktif dan kembali saat selesai, dan smoke test CI-nya lulus.

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

Diimplementasikan driver, tidak untuk diperluas dari luar.

```ts
type AgentUpdate =
  | { type: "text"; delta: string }
  | { type: "thought"; delta: string }
  | { type: "tool"; name: string; status: "start" | "ok" | "error"; detail?: string }
  | { type: "diff"; path: string; added: number; removed: number; patch?: string }
  | { type: "plan"; steps: { text: string; done: boolean }[] };

type PermissionRequest = {
  id: string; sessionId: string;
  action: "write" | "exec" | "network" | "delete" | "git";
  target: string; summary: string; patch?: string;
  risk: "low" | "high";
};
```

`AgentUpdate` sengaja superset kecil dari `session/update` ACP: cukup untuk merender chat, tidak lebih. Driver CLI mensimulasikan `text` dan `done` saja, lalu mengiklankan `caps.streaming = false`.
