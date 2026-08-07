# FRD — Functional Requirements Document

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026
**Konvensi:** `FR-<modul>-<no>`. Prioritas: **P0** wajib v1.0 · **P1** sebaiknya · **P2** ditunda.

> **Arah terkunci:** Telegram · Claude Code · Titen · open source · satu operator.
> Dokumen pendamping: `session-model.md`, `telegram-integration.md`, `install-flow.md`.

---

## 1. Modul: Onboarding & Konfigurasi (`SETUP`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-SETUP-01 | P0 | `npx caraka init` menjalankan wizard sesuai `install-flow.md`: deteksi lingkungan → workspace → bot Telegram → pairing → memory → jalankan & tunggu pesan pertama. Target median **< 3 menit / 6 interaksi**. |
| FR-SETUP-01b | P0 | Token bot divalidasi seketika lewat `getMe`; token disimpan di keychain OS (fallback file `chmod 600`) dan **tidak pernah** ditulis ke `config.yaml`. |
| FR-SETUP-01c | P0 | Pairing memakai deep link `https://t.me/<bot>?start=pair_<kode>` sehingga user cukup menekan **Start** — tidak ada chat id yang harus dicari atau disalin. |
| FR-SETUP-01d | P0 | Wizard berakhir dengan gateway berjalan dan menampilkan pesan pertama yang benar-benar masuk, lalu menawarkan pemasangan sebagai layanan latar. |
| FR-SETUP-01e | P1 | Wizard menawarkan pemasangan Titen (`curl -fsSL https://titen.dev/install.sh \| bash`) sebagai satu pilihan; gagal atau dilewati → provider `local`, **tanpa menghalangi**. |
| FR-SETUP-02 | P0 | Auto-discovery agent: pindai `PATH` untuk biner yang dikenal (`claude`, `codex`, `gemini`, `cline`, `cursor-agent`, `goose`, `amp`, …) **dan** baca ACP Registry JSON untuk metadata versi/distribusi. |
| FR-SETUP-03 | P0 | Konfigurasi tunggal di `~/.caraka/config.yaml`; semua nilai bisa dioverride via env `CARAKA_*`. |
| FR-SETUP-04 | P0 | `caraka doctor` memverifikasi: agent bisa dijalankan, kredensial channel valid, allowlist terisi, port bebas, versi ACP kompatibel, izin filesystem. Keluaran read-only dan aman untuk ditempel ke issue (rahasia diredaksi). |
| FR-SETUP-05 | P0 | Gateway **menolak start** bila `allowFrom` kosong pada channel DM. Pesan error harus menjelaskan cara memperbaiki. |
| FR-SETUP-06 | P0 | Memilih provider WhatsApp `baileys` mengharuskan konfirmasi eksplisit atas peringatan risiko ban (flag `acknowledgeRisk: true`). |
| FR-SETUP-07 | P1 | `caraka init --non-interactive` untuk instalasi otomatis. |
| FR-SETUP-08 | P1 | Migrasi konfigurasi antar versi otomatis dengan backup. |

---

## 2. Modul: Channel (`CHAN`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-CHAN-01 | P0 | **Telegram (Bot API 10.2) adalah satu-satunya channel di v1.0.** Discord & WhatsApp P1, Signal P2. |
| FR-CHAN-01b | P0 | Telegram memakai **long-polling** (bukan webhook) sehingga gateway tetap dapat `bind 127.0.0.1` tanpa port terbuka atau tunnel. |
| FR-CHAN-01c | P0 | Update yang memuat field tak dikenal **wajib diproses, tidak boleh dijatuhkan** — ini penyebab kerusakan paling umum saat versi Bot API naik. |
| FR-CHAN-02 | P0 | Semua channel mengimplementasikan interface `Channel` yang sama; capability opsional (`edit`, `askChoice`, `sendFile`, `setTyping`) dideklarasikan, dan core melakukan **fallback anggun** bila tidak tersedia. Permission ditolak bila channel tidak punya callback pilihan; approval tidak pernah berpindah ke teks chat. |
| FR-CHAN-03 | P0 | WhatsApp mendukung dua provider yang dapat dipilih: `baileys` dan `cloud-api`, dengan konfigurasi berbeda tapi perilaku core identik. |
| FR-CHAN-04 | P0 | Inbound: teks, gambar, dokumen, voice note (path file lokal disediakan ke agent). Voice note ditranskripsi hanya bila user mengonfigurasi transcriber. |
| FR-CHAN-05 | P0 | Outbound: teks (dengan code block), file, dan gambar. Konvensi lampiran: baris `MEDIA:<path-atau-url>` yang berdiri sendiri diekstrak core dan dikirim sebagai lampiran. |
| FR-CHAN-06 | P0 | Pesan panjang dipecah otomatis sesuai batas channel; **code block tidak boleh terpotong di tengah**. Bila > 3 pecahan, kirim sebagai file. |
| FR-CHAN-07 | P0 | Sanitizer keluaran per channel (Telegram MarkdownV2 escaping, WhatsApp formatting terbatas, Discord markdown). |
| FR-CHAN-08 | P0 | Indikator "sedang mengetik/bekerja" saat run aktif, bila channel mendukung. |
| FR-CHAN-09 | P1 | Grup: default `requireMention: true`; balasan hanya di thread/reply asal. |
| FR-CHAN-10 | P1 | Discord: satu thread per sesi. |
| FR-CHAN-11 | P0 | Rate limit outbound per channel + jitter; antrean bila melebihi. |
| FR-CHAN-12 | P0 | Reconnect otomatis dengan backoff eksponensial; status koneksi terekspos ke `doctor` dan log. |

---

## 3. Modul: Identitas, Pairing, Otorisasi (`AUTH`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-AUTH-01 | P0 | Setiap sender dipetakan ke `principal`. Hanya principal yang terdaftar di allowlist yang dilayani. |
| FR-AUTH-02 | P0 | Sender tak dikenal menerima balasan netral (tidak membocorkan keberadaan sistem) dan permintaan pairing dicatat. |
| FR-AUTH-03 | P0 | Pairing disetujui **di luar chat**: `caraka pair approve <channel> <code>` dari terminal lokal. |
| FR-AUTH-04 | P0 | Tiga mode kebijakan per principal per workspace: `read-only`, `assisted`, `trusted`. Default `assisted` untuk DM, `read-only` untuk grup. |
| FR-AUTH-05 | P0 | Mode `trusted` **kedaluwarsa** (default 60 menit) dan hanya bisa diaktifkan dari terminal lokal, bukan dari chat. |
| FR-AUTH-06 | P1 | Discord: pemetaan role → mode kebijakan. |
| FR-AUTH-07 | P0 | Semua keputusan otorisasi tercatat di audit log. |

---

## 4. Modul: Sesi & Routing (`SESS`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-SESS-01 | P0 | Satu sesi = `(principal, channel, chat, workspace, agent)`. Sesi persisten lintas restart. |
| FR-SESS-02 | P0 | Prefiks `@<workspace>` di awal pesan memindahkan/route ke workspace tersebut dan menjadi default untuk pesan berikutnya di chat itu. |
| FR-SESS-03 | P0 | Perintah: `/new` (sesi baru), `/stop` (batalkan run), `/status`, `/switch <agent>`, `/ws` (daftar workspace), `/mode <read-only\|assisted>`, `/help`. |
| FR-SESS-04 | P0 | **Satu run aktif per workspace.** Pesan baru saat run berjalan masuk antrean, dengan konfirmasi "diantrekan (#n)". `/stop` membatalkan run aktif via `session/cancel`. |
| FR-SESS-05 | P0 | Sesi idle direset otomatis sesuai konfigurasi (default: idle 7 hari atau harian pukul 04:00 — dapat dimatikan). |
| FR-SESS-06 | P0 | Kegagalan agent (crash/timeout) mengembalikan pesan yang bisa ditindaklanjuti, bukan stack trace, dan menawarkan `/new`. |
| FR-SESS-07 | P1 | Transkrip sesi dapat diekspor: `caraka session export <id>`. |

---

## 4A. Modul: Sesi sebagai Topic/Thread (`TOPIC`)

> Spesifikasi lengkap ada di `docs/session-model.md`.

| ID | P | Kebutuhan |
|---|---|---|
| FR-TOPIC-01 | P0 | Setiap sesi baru dibuatkan **forum topic** sendiri via `createForumTopic`, termasuk di **private chat** (tidak butuh hak admin). `message_thread_id` yang dikembalikan disimpan di `session.thread_ref`. |
| FR-TOPIC-02 | P0 | Nama topic: `<prefiks state> <workspace> · <judul tugas>`. Judul ditetapkan sekali, maksimal diperbaiki **satu kali** setelah respons pertama agent. |
| FR-TOPIC-03 | P0 | Ikon topic mencerminkan state lewat `editForumTopic`: 🔵 `running` · 🟡 `awaiting_approval` · 🟢 `done` · 🔴 `failed` · 🟣 `cancelled`. Hanya 6 nilai `icon_color` yang sah; perubahan hanya ditulis bila state benar-benar berubah (`session.icon_state`). |
| FR-TOPIC-04 | P0 | State juga muncul sebagai **prefiks teks** (`▸ ⏸ ✓ ✗ ⊘`) agar tidak bergantung pada persepsi warna. |
| FR-TOPIC-05 | P0 | Topic ditutup (`closeForumTopic`) setelah pesan ringkasan penutup dikirim, sehingga baris terakhir selalu menjelaskan hasilnya. |
| FR-TOPIC-06 | P0 | Pesan di dalam topic sesi **selalu** melanjutkan sesi itu; tidak pernah membuat topic baru. Pesan di topic sesi yang sudah `done` melakukan `reopenForumTopic` + `session/load`. |
| FR-TOPIC-07 | P0 | Topic **General** adalah ruang kontrol: memulai sesi baru, perintah global, dan tautan ke sesi yang dibuat. General tidak pernah ditutup atau dihapus. |
| FR-TOPIC-08 | P0 | Housekeeping: hapus topic `done` setelah 7 hari (dapat diatur; `0` = jangan pernah); batas **5 sesi aktif** bersamaan — melebihi itu tawarkan menutup yang terlama; `/pin` mengecualikan dari auto-hapus. |
| FR-TOPIC-09 | P0 | **Deteksi kemampuan wajib.** `createForumTopic` di supergroup **gagal diam-diam** bila forum mode mati. Sistem mendeteksi sekali saat startup, menyimpan `container.supports_threads`, dan jatuh ke **mode linear** (header `[ws · #id]` di setiap balasan) tanpa gagal keras. |
| FR-TOPIC-10 | P1 | Discord memetakan konsep yang sama ke thread dengan `auto_archive_duration: 10080`, dan **wajib** menghormati batas ±50 thread aktif per channel / 1.000 per guild dengan menutup sesi lama secara proaktif. |
| FR-TOPIC-11 | P0 | WhatsApp dan channel tanpa thread memakai mode linear — fungsi identik, hanya lebih padat. |

---

## 4B. Modul: Rendering Kaya (`RICH`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-RICH-01 | P0 | Ack dikirim sebagai teks polos dalam < 1 detik; progres diperbarui lewat `editMessageText` dengan throttle ≥ 1,5 detik. |
| FR-RICH-02 | P0 | Hasil akhir dikirim sebagai **`sendRichMessage` baru**, lalu pesan progres dihapus. **Tidak boleh** mencoba meng-edit pesan streaming menjadi rich message — tidak ada `editRichMessage`, dan hasilnya merusak format menjadi teks polos bertanda mentah. |
| FR-RICH-03 | P0 | Pemetaan block: ringkasan → paragraph · berkas berubah → **table** · isi diff → **code block** · hasil test → task list · rencana agent → list · log panjang → **details/collapsible** · peringatan → blockquote. |
| FR-RICH-04 | P1 | Bila tersedia, penalaran agent saat streaming dirender lewat `sendRichMessageDraft` + **`RichBlockThinking`** (dapat dimatikan bila terbukti berisik). |
| FR-RICH-05 | P0 | Batas 32.768 karakter dihormati; melebihi itu dipotong **di batas block** dan sisanya dikirim sebagai berkas. Code block tidak pernah terpotong di tengah. |
| FR-RICH-06 | P0 | `sendRichMessage` gagal → fallback otomatis ke MarkdownV2 (dengan sanitizer escaping), dan kegagalan dicatat. |
| FR-RICH-07 | P0 | Seluruh pemanggilan method baru (`sendRichMessage`, `sendRichMessageDraft`, method ephemeral) melewati **satu adapter tipis** yang memanggil HTTP langsung, sehingga migrasi ke tipe pustaka resmi cukup mengubah satu berkas. |

---

## 5. Modul: Agent Driver (`DRV`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-DRV-01 | P0 | Interface `AgentDriver` tunggal: `start(workspace)`, `prompt(sessionId, message, attachments)`, `onUpdate(cb)`, `onPermissionRequest(cb)`, `cancel(sessionId)`, `stop()`. |
| FR-DRV-02 | P0 | **Driver ACP:** spawn agent sebagai sub-process, JSON-RPC 2.0 via stdio; alur `initialize` → `authenticate` (bila perlu) → `session/new` → `session/prompt`; konsumsi notifikasi `session/update`; tangani `session/request_permission`; dukung `session/cancel`. |
| FR-DRV-03 | P0 | Driver ACP menegosiasikan versi protokol saat `initialize` dan menolak dengan pesan jelas bila versi tidak kompatibel. |
| FR-DRV-04 | P0 | Driver ACP meneruskan daftar MCP server milik user ke agent saat `session/new`. |
| FR-DRV-05 | P0 | **Driver CLI:** dikendalikan konfigurasi deklaratif dengan field: `command`, `args[]`, `resumeArgs[]`, `input(arg\|stdin)`, `maxPromptArgChars`, `output(json\|jsonl\|text)`, `resumeOutput`, `modelArg`, `modelAliases{}`, `sessionArg\|sessionArgs[]`, `sessionMode(always\|existing\|none)`, `sessionIdFields[]`, `systemPromptArg`, `systemPromptWhen(first\|always)`, `imageArg`, `imageMode`, `serialize`. |
| FR-DRV-06 | P0 | Preset bawaan untuk minimal: `claude-code`, `codex`, `gemini`, `cursor`, `goose`, `amp`, `aider`. |
| FR-DRV-07 | P0 | Pemilihan driver otomatis: ACP bila tersedia → CLI bila tidak → error yang menjelaskan opsi. Dapat dipaksa lewat config. |
| FR-DRV-08 | P1 | **Driver MCP inbox:** mengekspos MCP server dengan tool `inbox_pull`, `reply`, `ask`, `status`, untuk agent yang hidup di dalam IDE. |
| FR-DRV-09 | P0 | Timeout per run (default 30 menit) dan pembersihan proses anak saat gateway berhenti. |
| FR-DRV-10 | P1 | Health check per agent saat startup; agent yang gagal ditandai, bukan menggagalkan seluruh gateway. |

---

## 6. Modul: Approval (`APPR`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-APPR-01 | P0 | Permintaan izin dari agent dirender jadi kartu approval berisi: aksi, target (path/command), ringkasan dampak, dan tombol `[Setujui] [Tolak] [Lihat detail]`. |
| FR-APPR-02 | P0 | Setiap approval punya **nonce sekali pakai** dan **TTL** (default 10 menit). Kedaluwarsa → otomatis ditolak. |
| FR-APPR-03 | P0 | Approval **hanya** valid dari principal pemilik sesi. Callback ditandatangani; teks chat biasa **tidak pernah** dapat menyetujui. |
| FR-APPR-04 | P0 | Channel tanpa tombol memakai fallback: balasan berupa kode pendek (`ok A7F3` / `no A7F3`), tetap terikat nonce. |
| FR-APPR-04b | P1 | Tombol memakai `style` (hijau/merah) dan `icon_custom_emoji_id` bila tersedia — **peningkatan opsional**, bukan syarat. |
| FR-APPR-04c | P1 | Di grup, kartu approval dikirim sebagai **ephemeral message** (`receiver_user_id` = operator) sehingga hanya operator yang melihatnya; `callback_query_id` dipakai untuk membalas penekanan tombol secara ephemeral. |
| FR-APPR-04d | P0 | `callback_data` maksimal 64 byte → payload disimpan di DB dan hanya id-nya yang dikirim, ditandatangani HMAC. |
| FR-APPR-05 | P0 | Mode `read-only` menolak semua permintaan tulis/eksekusi otomatis, dengan penjelasan cara menaikkan mode. |
| FR-APPR-06 | P0 | Aksi berisiko tinggi (`git push --force`, `rm -rf`, migrasi DB, deploy, akses path terlarang) selalu butuh approval **meski** mode `trusted`, dan ditandai ⚠️. |
| FR-APPR-07 | P0 | Semua approval (diberikan/ditolak/kedaluwarsa) masuk audit log beserta identitas penyetuju. |

---

## 7. Modul: Memory (`MEM`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-MEM-01 | P0 | Interface `MemoryProvider`: `remember`, `recall`, `forget`, `pin`, `unpin`, `export`. |
| FR-MEM-02 | P0 | Provider tersedia: **`titen` (default)**, `local` (fallback), `none`. P1: `mcp` generik. |
| FR-MEM-03 | P0 | Provider `titen` bekerja **tanpa LLM** — konsolidasi Titen bersifat deterministik (*rules first, model only if it must*). Pemetaan: transcript & tool event → **observation**; keputusan/preferensi → **claim**; injeksi prompt → **context**. |
| FR-MEM-03b | P0 | Provider `local` adalah fallback minimal (SQLite + FTS5, tanpa embedding) untuk kasus Titen tidak terpasang. |
| FR-MEM-04 | P0 | Retrieval dan pemotongan budget dilakukan Titen lewat `POST /v1/context/compile` (scope dulu, lalu ranking ke dalam budget). Kita **tidak** membangun skoring hybrid sendiri. |
| FR-MEM-05 | P0 | Scope memori dipetakan ke hierarki Titen `org → workspace → project → run`. |
| FR-MEM-06 | P0 | **Injection limit:** budget token diteruskan eksplisit ke `context/compile` (default maks 6 item / 800 token). Konten memori disuntik dengan penanda **data, bukan instruksi**. |
| FR-MEM-06b | P1 | Setiap claim yang dipakai dapat dirunut ke buktinya (`GET /v1/claims/:id/evidence`) dan id-nya ditampilkan di ringkasan penutup sesi. |
| FR-MEM-06c | P1 | Outcome sesi dikirim balik lewat `POST /v1/context/:id/feedback` untuk menyetel recall berikutnya. |
| FR-MEM-07 | P0 | **Kegagalan memory tidak boleh menghentikan balasan.** Bila provider error/timeout (>500 ms), lanjutkan tanpa memori dan catat degradasi. |
| FR-MEM-08 | P0 | Dedup dan penggantian fakta usang memakai mekanisme `supersede`/`expire` bawaan Titen — **tidak diimplementasikan ulang** di sisi kita. Perselisihan dipertahankan sebagai perselisihan, tidak pernah dirata-rata. |
| FR-MEM-09 | P2 | Enrichment berbasis LLM mengikuti roadmap `consolidations` Titen; bila diaktifkan, berjalan **asinkron** di luar jalur balasan dan hasilnya ditandai agar dapat difilter. **Tidak dibangun sendiri.** |
| FR-MEM-09b | P1 | Coding agent user dapat disambungkan langsung ke MCP Titen di `/mcp`, sehingga agent membaca memori tanpa perantara gateway. |
| FR-MEM-10 | P0 | Perintah chat: `/ingat <teks>`, `/lupakan <id>`, `/memori` (daftar teratas). |
| FR-MEM-11 | P0 | Lapisan nol: file markdown `NOTES.md` per workspace yang dapat dibaca & diedit manusia, ikut di-index. |
| FR-MEM-12 | P1 | TTL & decay; `prune` otomatis saat melewati ambang. |

---

## 8. Modul: Audit & Observability (`AUD`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-AUD-01 | P0 | Log append-only untuk setiap event penting: pesan masuk/keluar, run mulai/selesai, approval, perubahan kebijakan, error. |
| FR-AUD-02 | P0 | Field wajib: `ts, channel, principal, session_id, workspace, agent, action, tool, args_hash, approval_id, result, duration_ms, tokens?`. |
| FR-AUD-03 | P0 | **Redaksi otomatis** rahasia sebelum ditulis dan sebelum dikirim ke chat (pola `sk-`, `ghp_`, `AKIA`, JWT, blok private key, isi `.env`). |
| FR-AUD-04 | P0 | `caraka audit --since 24h [--workspace x]` untuk penelusuran. |
| FR-AUD-05 | P1 | Rotasi + retensi yang dapat dikonfigurasi (default 30 hari). |
| FR-AUD-06 | P1 | Dashboard web read-only di `127.0.0.1`. |

---

## 9. Modul: Operasional (`OPS`)

| ID | P | Kebutuhan |
|---|---|---|
| FR-OPS-01 | P0 | Gateway bind ke `127.0.0.1` secara default; membuka ke alamat lain memerlukan flag eksplisit + peringatan. |
| FR-OPS-02 | P0 | Perintah: `start`, `stop`, `status`, `logs`, `doctor`, `pair`, `audit`, `session`, `config`. |
| FR-OPS-03 | P1 | Install sebagai service (launchd/systemd) opsional. |
| FR-OPS-04 | P0 | Reload konfigurasi tanpa kehilangan sesi aktif bila memungkinkan. |
| FR-OPS-05 | P1 | Cron/jadwal sederhana untuk memicu prompt berulang (default: nonaktif). |

---

## 10. Kebutuhan non-fungsional

| ID | Kebutuhan | Target |
|---|---|---|
| NFR-01 | Latensi ack pesan masuk | < 1 detik |
| NFR-02 | Overhead memory recall | < 150 ms p95 |
| NFR-03 | RAM idle | < 80 MB |
| NFR-04 | Cold start | < 2 detik |
| NFR-05 | Ukuran paket terinstal | < 15 MB |
| NFR-06 | Platform | macOS, Linux, Windows (WSL2 untuk channel tertentu) |
| NFR-07 | Uptime lokal | reconnect otomatis; tidak ada kondisi butuh restart manual pada operasi normal |
| NFR-08 | Ukuran kode inti | ≤ 8.000 LOC |
| NFR-09 | Bahasa antarmuka | Indonesia & Inggris (deteksi dari bahasa pesan) |
