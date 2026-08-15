# API & Extension Contracts

**English:** this document is Indonesian only, and stays that way because it is internal specification. English documentation starts at [`../README.md`](../README.md).

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
| `imageArg` | string | flag yang membawa path gambar ke argv, dibaca `src/drivers/cli.ts`. Tanpa field ini route ini tidak menerima berkas sama sekali (`acceptsFiles` bernilai false), dan gateway menjawab pengirimnya satu kalimat |
| `imageMode` | `repeat` \| `join` | cara lebih dari satu path disusun, dibaca `src/drivers/cli.ts`: `repeat` mengulang flag per path, `join` satu flag dengan path digabung koma. Default `repeat` |
| `env` | map | env tambahan untuk proses agent |
| `acp` | `{command, args[], env, asksPermission}` | spawn adapter ACP; `command` di-resolve terhadap `PATH`, kecuali adapter terkunci `claude-agent-acp` yang diselesaikan sebagai modul, dan di Windows hanya kandidat berakhiran `.exe` atau `.com` yang diterima. `asksPermission` menyatakan bahwa adapter ini pernah terlihat mengirim `session/request_permission` di mesin nyata; default `false`, dan run `read-only` menolak route yang tidak menyatakannya (§5 `security.md`) |

Dua amandemen 8 Agustus 2026 (pekerjaan `driver-v04`) membentuk tabel ini. Pertama, blok `acp:` masuk: tabel lama hanya mengenal field jalur CLI, padahal spawn ACP dikeraskan di kode driver — dan `{command, args, env}` terbukti cukup, vscode-acp berbicara ke sembilan agent berbeda hanya dengan tiga field itu per agent. Satu preset boleh memuat kedua jalur; pemilihan otomatis jatuh dari ACP ke CLI (FR-DRV-07). Kedua, field `sessionMode`, `systemPromptArg`, `systemPromptWhen`, `modelArg`/`modelAliases`, `imageArg`/`imageMode`, dan `serialize` keluar dari tabel: belum ada satu pun pembacanya di `src/`, dan skema yang menerima field tanpa pembaca menjanjikan perilaku yang tidak ada. Masing-masing kembali saat ada driver yang membacanya.

`imageArg` dan `imageMode` kembali pada 13 Agustus 2026, dengan pembacanya: `CliDriver` menyusun argv dari keduanya dan menyetel `acceptsFiles` dari ada atau tidaknya `imageArg` (`spec/lampiran-chat.md`). Yang memakainya hari ini hanya `codex.yaml` dengan `-i`; `claude-code.yaml` sengaja tidak diberi flag, dan alasannya ada di berkas itu. Empat field lain tetap di luar tabel sampai ada yang membacanya.

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
    "attachments": [{ "kind": "image", "path": "~/.caraka/inbox/a91/6f3c.png", "mime": "image/png" }],
    "ts": 1786100000000 } ] }
```

### `reply`

```json
{ "session_id": "a91", "text": "Ketemu. PaymentService.charge() melempar saat idempotency_key null.",
  "media": ["/tmp/caraka/diff.patch"] }
```

Tidak ada konvensi `MEDIA:<path>`. Baris itu tertulis di sini dan di `frd.md` sejak spesifikasi tanpa kode di belakangnya, dan dicabut pada 15 Agustus 2026: sebuah path yang diangkat dari teks agent adalah primitif baca-berkas yang dikendalikan masukan tidak tepercaya. Gambar keluar lewat `Channel.sendImage?` dan hanya dari byte yang agent kirim sendiri sebagai content block.

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

Bagian ini dulu menggambar `onMessage`/`onChoice`/`send` dan delapan `caps`; gateway tidak pernah memanggil bentuk itu. Sejak 8 Agustus 2026 (pekerjaan `discord-v05`) kontraknya milik `src/core/channel.ts`, dinamai dari method yang benar-benar dipanggil, dan yang di bawah ini adalah salinannya:

```ts
type ChannelId = string;
type ChannelCaps = { threads: boolean; buttons: boolean; edit: boolean; maxChars: number };
type MessageRef = { message_id: number | string };
type ThreadRef = { message_thread_id: number | string };
type ChannelCommand = { command: string; description: string };

interface Channel {
  readonly id: ChannelId;
  readonly caps: ChannelCaps;

  start?(signal?: AbortSignal): Promise<void>;
  updates(signal: AbortSignal): AsyncGenerator<InboundEvent>;

  setMyCommands(commands: ChannelCommand[], scopeId: string): Promise<unknown>;

  sendText(chatId: string, text: string, threadId?: string,
           replyMarkup?: Record<string, unknown>): Promise<MessageRef>;
  sendResult(chatId: string, markdown: string, threadId?: string): Promise<MessageRef[]>;
  editText(chatId: string, messageId: number | string, text: string): Promise<unknown>;
  deleteMessage(chatId: string, messageId: number | string): Promise<unknown>;

  createTopic(chatId: string, name: string): Promise<ThreadRef>;
  editTopic(chatId: string, threadId: string, name: string): Promise<unknown>;
  finishThread?(chatId: string, threadId: string): Promise<unknown>;

  answerCallback(id: string, text: string, alert?: boolean): Promise<unknown>;
  clearKeyboard(chatId: string, messageId: number | string): Promise<unknown>;

  direct?(principal: string): Promise<string>;
  pairingText(title: string, containerId: string): string;
  readiness(threads: boolean): Promise<string>;
}
```

`InboundEvent` mengisi tepat satu dari tiga slot: `message`, `callback_query`, atau `my_chat_member`. Bentuk ketiganya ada di berkas yang sama.

`getMe` keluar dari kontrak pada 13 Agustus 2026 (pekerjaan `grup-sapa-dan-menu`): tidak ada satu pun pemanggil di `src/core/`, dan pemanggil sungguhannya — wizard di `src/cli.ts` dan `readiness()` tiap adapter — memegang kelas konkretnya. Method yang tidak pernah dipanggil lewat kontrak tidak perlu ada di kontrak.

`InboundMessage` sejak tanggal yang sama membawa satu field opsional, `addressed?: boolean`, jawaban channel atas "pesan ini ditujukan ke bot atau tidak" (FR-CHAN-09). Tri-state pada pesan itulah laporan kemampuannya, bukan field kelima di `caps`: `undefined` berarti channel tidak bisa tahu, dan core menjawab pesan itu alih-alih diam.

Empat catatan yang menjelaskan kenapa bentuknya begini:

**Update adalah generator, bukan pendaftaran callback.** `Gateway.run()` menggerakkannya dengan satu `for await`. Channel yang mendorong menjembatani dorongannya ke generator di dalam adapternya sendiri, dan itu beberapa baris antrean.

**`caps` berisi empat field karena empat itulah yang punya pembaca.** `threads` menentukan sesi punya thread sendiri atau jalan linear, `buttons` menentukan kartu approval bertombol atau berkode pendek, `maxChars` menentukan panjang potongan ekor buffer progres, dan `edit` — mendarat di v0.6 bersama pembacanya — menentukan jalur progres hidup sama sekali: bernilai false, ack pertama tetap keluar dan tidak ada apa pun sesudahnya sampai hasil. `files`, `typing`, `rich`, dan `ephemeral` tetap rencana; mendeklarasikannya sekarang berarti menjanjikan sesuatu yang tidak ada yang memeriksa. WhatsApp memang mengirim berkas, tetapi keputusannya diambil di dalam channel seperti `FILE_AFTER_CHUNKS` di Discord, dan core tidak menanyakannya.

**Method bertanda `?` adalah kemampuan yang benar-benar berbeda antar platform.** `finishThread` dan `resumeThread` ada di kedua channel ber-thread, dan tetap opsional karena kemampuannya bisa absen di dalam satu channel: `closeForumTopic` didokumentasikan hanya untuk forum supergroup, jadi sesi Telegram di percakapan pribadi mendapat galat dan galatnya ditelan — sesi tetap tertandai. `direct` absen di Telegram karena DM dikunci id pengirimnya sendiri, sementara Discord harus membuka channelnya dulu.

**`pairingText` dan `readiness` mengembalikan kalimat, bukan bendera.** Apa yang terbaca anggota sebuah guild Discord bukan apa yang terbaca anggota grup Telegram, dan yang tidak sampai ke bot berbeda pula (privacy mode di satu sisi, intent tanpa privilege di sisi lain). Kata-katanya milik channel supaya core tidak perlu tahu channel mana yang menjawab.

**Aturan yang paling sering dilanggar kontributor:** core tidak pernah bercabang berdasarkan `channel.id`. Ia membaca `caps` dan menurunkan kualitas. Menambahkan `if (channel.id === "telegram")` ke core adalah kesalahan desain, bukan jalan pintas. `channel.id` sendiri sah dipakai sebagai identitas — kunci peta allowlist dan prefiks rute tersimpan — dan sebuah test menjaga batas itu dengan grep yang gagal bila sebuah perbandingan muncul di `src/core/`.

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
