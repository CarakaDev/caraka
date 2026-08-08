# Design — Arsitektur Teknis

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026

> **v0.2 menambahkan:** lapisan topic/thread (sesi ber-tab), rendering kaya, dan Titen sebagai provider memory default. Lihat §11–§13.

---

## 1. Gambaran sistem

```
┌─────────────────────────────────────────────────────────────┐
│ CHANNEL LAYER                                               │
│  telegram/  whatsapp/  discord/  signal/                    │
│  → InboundMessage · ← OutboundMessage                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ CORE (proses tunggal, event-driven)                         │
│                                                             │
│  identity.ts   principal, pairing, allowlist                │
│  router.ts     chat ⇄ session ⇄ workspace ⇄ agent           │
│  policy.ts     read-only / assisted / trusted, aksi berisiko│
│  approval.ts   nonce, TTL, signed callback                  │
│  runner.ts     antrean, 1 run/workspace, timeout, cancel    │
│  memory.ts     MemoryProvider + injection budget            │
│  render.ts     update agent → pesan channel                 │
│  audit.ts      append-only + redaksi rahasia                │
└───────────────────────────┬─────────────────────────────────┘
                            │  AgentDriver
┌───────────────────────────▼─────────────────────────────────┐
│ DRIVER LAYER                                                │
│  acp/      JSON-RPC 2.0 over stdio        ← utama           │
│  cli/      spawn + parse (json/jsonl/text) ← fallback       │
│  mcp/      MCP server dengan inbox         ← agent-di-IDE   │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
      Coding agent milik user: model, tools, sandbox, repo context
```

Semua state lokal: `~/.caraka/` (config.yaml, caraka.db, logs/, sessions/). `sessions/` adalah state sesi agent, bukan tempat kredensial: setiap rahasia channel — token bot, dan sejak v0.6 auth state Baileys di `secrets/whatsapp/` — tinggal di `~/.caraka/secrets/` pada mode 0700 (`security.md` §6).

---

## 2. Kontrak inti

### 2.1 Pesan

```ts
type InboundMessage = {
  id: string;
  channel: ChannelId;
  chatId: string;
  senderId: string;                 // id mentah dari channel
  text: string;
  attachments: Attachment[];        // {kind, path, mime, size}
  replyTo?: string;
  isGroup: boolean;
  mentionedBot: boolean;
  ts: number;
};

type OutboundMessage = {
  text?: string;
  files?: { path: string; caption?: string }[];
  choices?: Choice[];               // dirender jadi tombol bila didukung
  editOf?: MessageRef;              // update status di tempat
  parseMode?: "plain" | "markdown";
};
```

### 2.2 Channel

Bentuk lengkapnya ada di `src/core/channel.ts` dan dikutip utuh di `docs/api.md` §4. Sejak 8 Agustus 2026 (pekerjaan `discord-v05`) ia dinamai dari permukaan yang benar-benar dipakai gateway, bukan dari sketsa `onMessage`/`onChoice`/`send`:

```ts
interface Channel {
  readonly id: ChannelId;
  readonly caps: { threads: boolean; buttons: boolean; maxChars: number };
  start?(signal?: AbortSignal): Promise<void>;
  updates(signal: AbortSignal): AsyncGenerator<InboundEvent>;
  // …kirim, edit, hapus, thread, callback: daftar penuhnya di api.md §4
}
```

Update mengalir sebagai async generator yang di-`for await` gateway dalam satu baris. Discord mendorong lewat WebSocket dan Telegram menarik lewat long-poll; jembatan dari dorongan ke generator adalah antrean beberapa baris di dalam adapter, dan itu lebih kecil daripada menulis ulang loop gateway.

Core **tidak pernah** bercabang berdasarkan `channel.id`. Ia hanya membaca `caps` dan menurunkan kualitas secara anggun. Ini satu-satunya cara menjaga jumlah channel tidak meledakkan kompleksitas.

### 2.3 Agent driver

```ts
interface AgentDriver {
  start(): Promise<void>;
  session(existing: string | null, cwd: string): Promise<string>;  // → agentSessionId
  prompt(sessionId: string, prompt: string, route: DriverRoute): Promise<{ stopReason: string }>;
  setMode(sessionId: string, modeId: string): Promise<unknown>;    // tanpa mode → resolve tanpa efek
  cancel(sessionId: string): Promise<unknown>;
  stop(): Promise<void>;
}

type DriverRoute = {
  update(notification: AgentUpdate): void | Promise<void>;
  permission(request: PermissionRequest): Promise<PermissionResponse>;
};
```

Bagian ini dulu menggambar interface dengan `kind`, `caps`, `newSession`/`loadSession`, dan tiga callback `onUpdate`/`onPermission`/`onDone`, plus `AgentUpdate` berbentuk delta `text`/`thought`/`tool`/`diff`/`plan`. Gateway tidak pernah membutuhkan satu pun darinya. Interface di atas dinamai dari permukaan yang terbukti dipakai dan tinggal di `src/core/driver.ts`; bentuk `AgentUpdate` dan `PermissionRequest`-nya (subset wire ACP) ada di `api.md` §5. Diamendemen 8 Agustus 2026 oleh pekerjaan `driver-v04`, supaya dokumen berhenti menggambar driver yang tidak ada. Driver CLI memenuhi kontrak yang sama dengan memfabrikasi satu update teks per giliran; UI menyesuaikan.

---

## 3. Driver ACP (jalur utama)

### Urutan

```
spawn(agentCmd, args, {cwd: workspace.path, env})
  ↓ stdio JSON-RPC 2.0
initialize { protocolVersion, clientCapabilities: { fs: true, terminal: false } }
  ← { protocolVersion, agentCapabilities, authMethods }
[authenticate] bila diperlukan
session/new { cwd, mcpServers: [...] }        → sessionId
session/prompt { sessionId, prompt: [...] }
  ← session/update (notifikasi, berkali-kali)
  ← session/request_permission  → jawab setelah user menekan tombol
  ← hasil akhir / stopReason
session/cancel { sessionId }                   saat /stop
```

**Catatan implementasi**
- Negosiasi versi wajib; tolak dengan pesan jelas bila di luar rentang dukungan (schema v1/v2 keduanya ada di repo ACP).
- `mcpServers` diambil dari config user dan diteruskan apa adanya — ACP dan MCP jalan berdampingan.
- Satu proses agent bisa melayani beberapa session; kita tetap membatasi **1 run aktif per workspace** demi keamanan file.
- `session/request_permission` dipetakan ke `approval.ts`; **jawaban tidak pernah datang dari teks chat.**
- Backpressure: chunk `text` diakumulasi dan di-flush maksimal tiap 1,5 detik ke channel.

### Penemuan agent

1. Baca `~/.caraka/config.yaml` → daftar eksplisit
2. Pindai `PATH` untuk biner yang dikenal, probe versinya lewat `--version`
3. Cache hasil selama 24 jam di `~/.caraka/discovery.json`; `doctor` memaksa refresh

Pembacaan ACP Registry JSON — dulu langkah tersendiri di sini — ditunda 8
Agustus 2026 (`driver-v04`): metadata yang dibacanya tidak ditampilkan di mana
pun, jadi pembacaannya adalah kode mati seharga satu fetch per first run. Ia
kembali bersama baris `doctor` yang menampilkannya.

---

## 4. Driver CLI (fallback)

Satu implementasi (`src/drivers/cli.ts`), dikendalikan tabel — preset YAML di `presets/agents/`, satu berkas per agent, skemanya di `api.md` §1. Blok inline yang dulu tertulis di sini memakai bentuk map `agents:` dan field yang tidak pernah dibaca kode; diamendemen 8 Agustus 2026 (`driver-v04`) menjadi bentuk berkas yang dikirim. Contoh yang membawa kedua jalur:

```yaml
# presets/agents/claude-code.yaml
id: claude-code
driver: acp
acp:
  command: claude-agent-acp
  args: []
command: claude
args: ["-p", "--output-format", "json", "--session-id", "{sessionId}"]
resumeArgs: ["-p", "--output-format", "json", "--resume", "{sessionId}"]
output: json
```

Parser: `json` → ambil field teks + session id; `jsonl` → baca aliran, ambil pesan agent terakhir + id thread; `text` → stdout apa adanya.

Batasan yang dikomunikasikan jujur ke user: tanpa streaming, dan tanpa permission hook — persetujuan di jalur ini jatuh ke rem agent-nya sendiri, seperti sandbox codex (`--sandbox read-only`) dan konfirmasi bawaan aider. Kebijakan lokal level prompt yang dulu dijanjikan kalimat ini belum dibangun (dicatat 8 Agustus 2026, `driver-v04`); field config yang tampak seperti gerbangnya dicabut sampai gerbang itu ada di jalur run.

---

## 5. Driver MCP inbox (agent-di-IDE)

Kita menjadi **MCP server**; Cline/Kilo/Roo/Windsurf/Kiro/Antigravity memanggil tool kita.

| Tool | Signature | Perilaku |
|---|---|---|
| `inbox_pull` | `(workspace?) → Message[]` | Ambil & tandai pesan chat yang belum diproses |
| `reply` | `(session_id, text, media?)` | Kirim balasan ke chat asal |
| `ask` | `(session_id, question, options[]) → string` | Blokir sampai user memilih (long-poll, timeout 10 mnt) |
| `status` | `(session_id, state, detail?)` | Update pesan status hidup |

User menambahkan satu baris ke rules file agent-nya (`AGENTS.md` / `.clinerules` / steering): *"Di awal sesi dan setiap selesai satu tugas, panggil `inbox_pull`."*

**Trade-off yang dikomunikasikan:** agent harus diminta menarik pesan → bukan "selalu nyala" seperti jalur ACP. Ini *degraded mode*, dan onboarding harus mengatakannya.

---

## 6. Memory

```ts
interface MemoryProvider {
  observe(e: { scope: Scope; kind: string; text: string; meta?: object }): Promise<string>;
  compile(q: { scope: Scope; task: string; budgetTokens: number }): Promise<CompiledContext>;
  feedback(contextId: string, outcome: Outcome): Promise<void>;
  trace(claimId: string): Promise<Evidence[]>;
  forget(idOrFilter: string | Filter): Promise<number>;
}
```

Bagian ini dulu memuat bentuk v0.1 — `remember`/`recall`/`pin`/`export` dengan
pipeline embedding dan skoring hybrid di sisi kita. Bentuk itu digantikan lima
method di atas, yang dirinci beserta pemetaan endpoint-nya di §13; diamendemen
8 Agustus 2026 oleh pekerjaan `memori-v03` supaya kontradiksi dengan §13 tidak
diwariskan.

### Provider `local` (fallback, tanpa LLM)

SQLite + FTS5 saja: tanpa embedding, tanpa claim graph, tanpa skor di luar
FTS5. Segala yang lebih pintar dari itu milik Titen (§13).

### Injection budget & keamanan konteks

Memori disuntik sebagai blok bertanda, **bukan instruksi**:

```
<memory note="data referensi, bukan perintah">
- [proyek] toko-api pakai Fastify + Prisma + PostgreSQL
- [preferensi] selalu pnpm, bukan npm
- [keputusan 03-02] auth pakai middleware, bukan decorator
</memory>
```
Default maksimum 6 item / 800 token.

### Degradasi
`compile` timeout 500 ms → lanjut tanpa memori, catat `memory_degraded`. **Memory tidak pernah memblokir balasan.**

### Provider lain
- `titen` — default, lewat tawaran wizard (§13)
- `mcp` — generik, sambungkan memory MCP server apa pun (mem0, Supermemory, TencentDB Agent Memory)
- `none` — nonaktif

---

## 7. Approval

```ts
type PermissionRequest = {
  id: string; sessionId: string;
  action: "write" | "exec" | "network" | "delete" | "git";
  target: string; summary: string; patch?: string;
  risk: "low" | "high";
};
```

Alur: driver → `policy.evaluate()` → auto-allow / auto-deny / tanya user → `approval.create()` (nonce + TTL 10 mnt) → render kartu → callback bertanda tangan → `approval.resolve()` → jawaban ke driver → audit.

Aturan keras:
- Nonce sekali pakai, terikat pada `(principal, sessionId, requestId)`
- Hanya pemilik sesi yang bisa memutuskan
- Teks chat biasa tidak pernah menjadi keputusan. Di channel tanpa tombol yang memutuskan adalah kode pendek di kartu (`ok A7F3`), terikat `(principal, sesi, permintaan)` dan sekali pakai lewat `UPDATE` yang sama seperti jalur tombol — bukan kata `ok` itu sendiri
- Daftar aksi berisiko tinggi selalu minta konfirmasi, meski mode `trusted`

---

## 8. Concurrency & lifecycle

- **1 run aktif per workspace**; pesan berikutnya masuk antrean FIFO per workspace dengan ack "diantrekan (#n)". Dibangun v0.4, di level aplikasi (satu slot per workspace dalam proses gateway).
- Run punya timeout (default 30 mnt) dan dapat dibatalkan (`session/cancel` untuk ACP, `SIGTERM` → `SIGKILL` setelah 5 detik untuk CLI).
- Pool proses ber-idle-shutdown yang dulu tertulis di sini belum dibangun (dicatat 8 Agustus 2026, `driver-v04`): proses CLI keluar sendiri di akhir giliran, dan adapter ACP tetap satu anak proses per driver yang dihentikan saat shutdown.
- Restart gateway memulihkan sesi dari SQLite; penandaan run terputus sebagai `interrupted` juga belum dibangun — perilaku restart v0.3 bertahan.

---

## 9. Struktur direktori

```
caraka/
├── src/
│   ├── core/        identity  router  policy  approval  runner  memory  render  audit
│   ├── channels/    telegram.ts  discord.ts  whatsapp.ts (baileys + cloud-api)  signal nanti
│   ├── drivers/     acp/  cli/  mcp/
│   ├── memory/      titen/  local/  mcp/
│   ├── store/       db.ts  migrations/
│   ├── cli/         init  doctor  pair  trust  audit  session  config
│   └── index.ts
├── presets/agents/  claude-code.yaml  codex.yaml  gemini.yaml  …
└── docs/
```

Aturan dependensi satu arah: `channels → core ← drivers`. Channel tidak pernah mengimpor driver, dan sebaliknya.

---

## 11. Lapisan topic/thread (sesi ber-tab)

> Spesifikasi perilaku ada di `docs/session-model.md`; ini bagian teknisnya.

### Bagian thread pada interface `Channel`

```ts
caps: { threads, buttons, maxChars }

createTopic(chatId, name): Promise<ThreadRef>;
editTopic(chatId, threadId, name): Promise<unknown>;
finishThread?(chatId, threadId): Promise<unknown>;   // absen = berhenti di rename
```

`finishThread` opsional karena kemampuannya benar-benar berbeda: `closeForumTopic` Telegram hanya berlaku di supergroup dan `deleteForumTopic` ikut membawa transkripnya, jadi sesi Telegram berhenti di penggantian nama; Discord menyetel `archived: true`. Core menandai sesi selesai dengan cara yang sama di kedua kasus.

Lima kemampuan yang dulu ditulis di sini — `edit`, `files`, `typing`, `rich`, `ephemeral` — tetap rencana. Tidak satu pun punya pembaca di core, dan `docs/api.md` §4 sendiri mensyaratkan deklarasi yang jujur.

Core tetap **tidak pernah** bercabang berdasarkan `channel.id` — ia hanya membaca `caps` lalu menurunkan kualitas secara anggun.

### Modul `topics.ts`

```
ensureThread(session)      → buat topic bila belum ada, simpan thread_ref
syncState(session, state)  → tulis ikon + prefiks HANYA bila icon_state berubah
finalize(session, result)  → kirim ringkasan, lalu closeThread
sweep()                    → hapus topic done yang lewat close_after; tegakkan batas 5 sesi aktif
detect(container)          → uji sekali apakah pembuatan topic berhasil → supports_threads
```

**Deteksi wajib.** `createForumTopic` di supergroup **gagal diam-diam** bila forum mode mati, jadi di Telegram deteksinya adalah satu topic uji yang dibuat lalu dihapus.

Discord tidak butuh bentuk itu dan tidak memakainya: ia melempar error saat izin kurang atau batas thread tercapai, sehingga percobaan nyata yang pertama sudah menjadi deteksinya — dan sebuah thread uji hanya akan menambah satu thread ke batas yang sedang diuji. Hasilnya disimpan per container di tabel `meta` dan dihapus oleh `doctor` supaya percobaan berikutnya mendeteksi ulang.

### Batas per platform

| Platform | Aturan yang ditegakkan `sweep()` |
|---|---|
| Telegram (DM) | maks 5 sesi aktif; hapus `done` setelah 7 hari |
| Telegram (supergroup) | idem + verifikasi `can_manage_topics` |
| Discord | `auto_archive_duration: 10080`; batas < 50 thread aktif/channel dan < 1.000/guild tidak ditegakkan di sini — thread terarsip tetap dihitung Discord, jadi batasnya tiba sebagai error pembuatan thread (`done/discord-v05/spec.md` AC-4.6) |
| WhatsApp / tanpa thread | mode linear: setiap balasan berprefiks `[ws · #id]` |

---

## 12. Rendering (`render.ts`)

Satu fungsi menerjemahkan `AgentUpdate[]` + `RunResult` menjadi pesan channel.

```
ack        → sendMessage teks polos                    (< 1 dtk)
progress   → editMessageText pesan ack, throttle 1,5 dtk
result     → sendRichMessage BARU  +  deleteMessage(progress)
```

**Kenapa hasil akhir bukan hasil edit:** bukan karena API melarangnya. `editMessageText` menerima parameter `rich_message` sejak Bot API 10.1, jadi sebuah pesan bisa di-edit menjadi rich message. Yang menahan adalah laporan lapangan bahwa format rich hancur menjadi teks polos bertanda mentah saat di-edit di tengah stream — laporan yang **belum diuji ulang** setelah 10.1. Pola kirim-baru + hapus-lama dipertahankan karena ia sudah bekerja.

Peta block: ringkasan → paragraph · berkas berubah → **table** · diff → **code block** · hasil test → task list · rencana → list · log panjang → **details** · peringatan → blockquote · penalaran streaming → `InputRichBlockThinking`.

Seluruh method Bot API terbaru (`sendRichMessage`, `sendRichMessageDraft`, `editEphemeralMessage*`, `deleteEphemeralMessage`) dipanggil lewat **satu adapter HTTP tipis** (`channels/telegram/raw.ts`) karena pustaka masih tertinggal dari API. Migrasi ke tipe resmi kelak cukup mengubah satu berkas. Fallback bila `sendRichMessage` gagal: MarkdownV2 dengan sanitizer escaping.

---

## 13. Memory dengan Titen

```ts
interface MemoryProvider {
  observe(e: { scope: Scope; kind: string; text: string; meta?: object }): Promise<string>;
  compile(q: { scope: Scope; task: string; budgetTokens: number }): Promise<CompiledContext>;
  feedback(contextId: string, outcome: Outcome): Promise<void>;
  trace(claimId: string): Promise<Evidence[]>;
  forget(idOrFilter: string | Filter): Promise<number>;
}
```

Pemetaan ke API Titen:

| Operasi kita | Endpoint Titen |
|---|---|
| `observe` | `POST /v1/observations` (append-only, content hash) |
| konsolidasi | `POST /v1/consolidations` — *rules first, model only if it must* |
| `compile` | `POST /v1/context/compile` — scope dulu, lalu ranking ke dalam budget |
| `feedback` | `POST /v1/context/:id/feedback` |
| `trace` | `GET /v1/claims/:id/evidence` |

Apa yang **kita hapus** dari lingkup karena Titen sudah mengerjakannya: skoring hybrid BM25+vektor, dedup, TTL/decay, `superseded_by`, dan pemotongan budget injeksi. Semuanya menjadi parameter, bukan kode.

**Aturan yang tidak berubah:** `compile` timeout 500 ms → lanjut tanpa memori, catat `memory_degraded`. **Memori tidak pernah memblokir balasan.** Konten memori disuntik dengan penanda data, bukan instruksi — prinsip yang juga dipegang Titen secara eksplisit.

Provider `local` (fallback): SQLite + FTS5 saja, tanpa embedding, tanpa claim graph. Cukup untuk mengingat preferensi dasar bila Titen tidak terpasang.

Opsional: coding agent user dapat disambungkan **langsung** ke MCP Titen di `/mcp` lewat daftar `mcpServers` yang kita teruskan saat `session/new` — agent membaca memori sendiri, tanpa perantara.

---

## 10. Poin ekstensi (satu-satunya yang didukung)

1. **Preset agent** — file YAML di `presets/agents/`. Menambah agent baru pada jalur CLI = satu file, nol kode.
2. **MCP server** — dipasang user secara sadar, diteruskan ke agent lewat ACP.
3. **Memory provider** — implementasi interface; hanya untuk penggunaan lanjut.

**Tidak ada plugin runtime, tidak ada dynamic loading, tidak ada marketplace.** Ini keputusan keamanan sekaligus keputusan kompleksitas.
