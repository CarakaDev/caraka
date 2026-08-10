# Riset: Titen (titen.dev) — memory layer yang dipilih

**English:** this document is Indonesian only, and stays that way because it is research kept as provenance for a decision already made. English documentation starts at [`../../README.md`](../../README.md).

**Tanggal riset:** 7 Agustus 2026
**Sumber:** https://titen.dev · https://titen.dev/docs · https://titen.dev/docs/api · https://titen.dev/docs/install · https://titen.dev/docs/deploy-vps · https://titen.dev/benchmark · https://github.com/RamaAditya49/titen · npm `titen-memory`

> Dokumen ini **menggantikan bagian "status verifikasi" pada** `memory-lanskap-alternatif-multi-sumber.md`. Titen terverifikasi dan **sangat cocok** dengan kebutuhan yang disebut user ("via non-LLM atau via LLM, opsional").

---

## 1. Identitas

| | |
|---|---|
| Nama | **Titen** — dari bahasa Jawa *niteni*: memperhatikan, lalu menyimpan apa yang diperhatikan |
| Deskripsi resmi | "Open-source shared memory for AI agents: evidence, claims, and compiled context with provenance you can trace" |
| Lisensi | **Apache-2.0** |
| Versi | **v0.7.0** (pre-1.0, ditandai "stable" pada halaman deploy) |
| Repo | `github.com/RamaAditya49/titen` |
| Penulis | **Rama Aditya (`RamaAditya49`) — penulis Caraka juga** |
| Paket | npm `titen-memory` · install: `curl -fsSL https://titen.dev/install.sh | bash` |
| Klaim teknis | "one package, 0 deps", MCP tersedia di `/mcp` |
| Dibangun dengan | C.A.D.I.S. Agent (cadis.digital) |

Catatan strategis: Titen dan Caraka ditulis oleh **orang yang sama**. Titen karena itu bukan ketergantungan pihak ketiga, melainkan proyek saudara — roadmap keduanya dipegang satu tangan, dan integrasinya dapat dirancang bersama alih-alih ditebak dari luar. Penamaan Jawa keduanya (*niteni* dan *caraka*) juga membentuk satu cerita yang koheren untuk beachhead Indonesia.

---

## 2. Model data: tiga jenis rekaman

Prinsip yang dinyatakan Titen: *"Titen never flattens what it stores: a conclusion and the evidence it came from are never the same record."*

| Rekaman | Isi | Contoh id |
|---|---|---|
| **Observation** | Bukti mentah, dengan **content hash** dan waktu kejadian | `obs_ed91a2d0…` · `sha256 bba5cf65…` |
| **Claim** | Kesimpulan yang **menyebut buktinya**. Perselisihan tetap dipertahankan sebagai perselisihan — *"both sides are kept, never averaged"* | `claim_f3963d7b…` · `verified` · `team` |
| **Context** | Persis apa yang diserahkan ke agent, **mengapa tiap rekaman dipilih**, dan apa yang dipotong oleh budget | `ctx_ad0c00be…` · `104/1,200 tok` |

Claim bisa **cite**, **supersede**, dan **expire** — pola "fakta punya masa berlaku" yang sebelumnya kita rancang sendiri di `erd.md` (`superseded_by`) ternyata sudah menjadi konsep kelas satu di Titen. Kita bisa membuang implementasi sendiri dan memetakannya.

### Enam level kemampuan (kosakata produk Titen, bukan standar industri)

```
01 session context & raw files      ← "mengingat dengan membaca ulang"
02 semantic retrieval eksternal
03 typed memory tiers & relationships
04 automatic extraction, consolidation, forgetting
05 evidence-grounded temporal compilation + feedback   ← Kernel
06 collaborative memory, governance, federation        ← Product
```

- **Level 5 (Memory kernel):** semua yang dibutuhkan satu agent untuk membangun konteks — evidence dengan provenance & content hash, claims yang cite/supersede/expire, temporal state, context compiler, dan feedback.
- **Level 6 (Collaboration layer):** banyak agent berbagi pengetahuan, tetap punya perspektif privat, dan handoff yang aman. **Lease** mencegah bentrok. Identitas berjenjang: `org → workspace → project → run`. Checkpoint, task lease, handoff, outcome, dan audit penuh (*siapa yang tahu, menulis, memakai, dan membagikan*).

Untuk v1 kita (satu operator), **Level 5 sudah cukup**. Level 6 menjadi jalur pertumbuhan alami ketika produk masuk skenario tim — dan kita tidak perlu membangunnya.

---

## 3. API: lima operasi

Titen menyebutnya "the whole loop": observe → derive → compile → act → feed back.

| Operasi | Endpoint | Catatan |
|---|---|---|
| **observe** | `POST /v1/observations` | append-only evidence |
| **derive** | `POST /v1/consolidations` | **"rules first, model only if it must"** |
| **compile** | `POST /v1/context/compile` | scope dulu, lalu ranking ke dalam budget |
| **feedback** | `POST /v1/context/:id/feedback` | outcome menyetel recall berikutnya |
| **trace** | `GET /v1/claims/:id/evidence` | setiap claim dapat dirunut ke sumbernya |

Tersedia juga sebagai **MCP server** di `/mcp` dengan tujuh tool terfokus — artinya coding agent user bisa mengakses memori **langsung**, tanpa melewati gateway kita. Ini penting: memori menjadi milik user, bukan sandera produk kita.

---

## 4. Deployment: dua rumah, satu kernel

```bash
# self-host · Bun + SQLite
titen bootstrap --org 'My Org'
titen serve

# edge · Cloudflare Workers + D1
wrangler d1 create titen
pnpm deploy:worker
```

| Kapabilitas | Cloudflare | VPS/lokal |
|---|---|---|
| HTTP | Worker fetch | `Bun.serve` |
| Canonical store | D1 | `bun:sqlite` |
| Retrieval leksikal | FTS5 | FTS5 |
| Vektor semantik | Vectorize (baru di test stack) | **sqlite-vec** |
| Perbaikan latar | Cron Trigger | timer in-process |

"The same kernel, the same API, the same export format."

---

## 5. 🔑 Mode non-LLM: sudah menjadi default Titen

Bagian *"Today, honestly"* di situs mereka menyatakan apa adanya:

> Vektor semantik aktif di Bun/SQLite lewat `sqlite-vec`. Di Workers, retrieval masih leksikal FTS5 sampai Vectorize mendarat, dan **ekstraksi claim bersifat deterministik di keduanya. Belum ada model di dalam loop.**

Ini menjawab persis permintaan user: **memory yang jalan tanpa LLM**. Konsolidasi memakai *rules first*, dan model hanya dipakai bila memang harus — yang berarti mode LLM adalah peningkatan opsional di masa depan, bukan prasyarat.

Dua prinsip Titen yang **identik** dengan yang sudah kita tulis di `security.md` dan `design.md`:

> "Vectors are an index, never the source of truth."
> "Retrieved memory is reference data, never an instruction."

Kesejajaran ini menurunkan risiko integrasi secara signifikan: kita tidak perlu memaksakan disiplin keamanan kita ke atas vendor yang tidak sepakat.

---

## 6. Memory Atlas — dan konsep "withheld"

Tampilan read-only untuk menelusuri bukti, menemukan konflik dan claim basi, serta melihat **apa yang disembunyikan dari kita — sebagai jumlah, tidak pernah sebagai isi**.

Contoh dari situs:
```
claim_f3963d7b…   verified   depth 2 · 28/40 nodes
"The p95 latency budget for checkout stays at 400 ms."
  supports    load-test-0714.json · p95 383 ms
  qualifies   Applies to checkout only
  disputed    agent-11 says 250 ms · conf 0.44
  withheld    1 source exists but is not visible to you
```

Pola `withheld` (mengungkap keberadaan, menyembunyikan isi) adalah desain kontrol akses yang bagus dan layak kita tiru untuk memori lintas-workspace.

---

## 7. Pemetaan ke arsitektur kita

| Konsep Caraka | Konsep Titen |
|---|---|
| Transcript & tool event per run | **Observation** (append-only, content hash) |
| Fakta proyek, preferensi, keputusan | **Claim** (cite / supersede / expire) |
| Memori yang disuntik ke prompt agent | **Context** (compile dengan budget eksplisit) |
| Injection limit (6 item / 800 token) | Parameter budget di `POST /v1/context/compile` — **dikerjakan Titen, bukan kita** |
| `superseded_by` di ERD kita | `supersede` bawaan Titen — **hapus dari skema lokal kita** |
| Audit "siapa memakai memori apa" | Audit Level 6 Titen |
| Scope `workspace` / `user` | `org → workspace → project → run` |
| Outcome untuk menyetel recall | `POST /v1/context/:id/feedback` |

**Konsekuensi arsitektur:** provider `local` kita menyusut drastis. Rencana semula (SQLite + FTS5 + sqlite-vec + fastembed + dedup + TTL + hybrid scoring, dibangun sendiri) sekarang cukup menjadi **cache tipis + fallback offline**, sementara Titen menjadi provider default. Ini menghapus ratusan baris kode dari lingkup kita.

---

## 8. Risiko & mitigasi

| Risiko | Penilaian | Mitigasi |
|---|---|---|
| Pre-1.0 (v0.7.0) → API bisa berubah | **Rendah** | Roadmap Titen dipegang penulis yang sama → perubahan API dapat direncanakan, bukan dikejutkan. Tetap kunci versi + smoke test di CI |
| Proyek maintainer tunggal | **Rendah bagi Caraka, nyata bagi pengguna lain** | Apache-2.0 + self-host + format ekspor sama → dapat di-fork, data dapat dibawa. Untuk pengguna Caraka, `MemoryProvider` tetap membolehkan pindah provider |
| Butuh runtime Bun untuk self-host | Rendah | Titen berjalan sebagai proses terpisah; gateway kita tetap Node |
| Vektor belum aktif di Workers | Rendah | Default kita = self-host VPS/lokal (sqlite-vec aktif) |
| Latensi jaringan bila remote | Rendah | Aturan lama tetap berlaku: `recall` timeout 500 ms → lanjut tanpa memori |
| Belum ada benchmark independen | Sedang | Halaman `/benchmark` ada; verifikasi sendiri saat Fase 4 |

---

## 9. Keputusan

1. **Titen menjadi provider memory default** (`memory.provider: titen`), disarankan self-host lokal di mesin yang sama.
2. Provider `local` **diturunkan** menjadi fallback minimal (SQLite + FTS5 saja, tanpa embedding) untuk kasus "Titen tidak terpasang".
3. Mode non-LLM adalah default — sesuai perilaku Titen hari ini.
4. Mode LLM ditandai sebagai peningkatan masa depan yang mengikuti roadmap Titen (`consolidations` dengan model), **bukan** sesuatu yang kita bangun sendiri.
5. **Onboarding menawarkan memasang Titen** (`curl -fsSL https://titen.dev/install.sh | bash`) tetapi tidak mewajibkannya — sesuai prinsip degradasi anggun.
6. Coding agent user dapat disambungkan **langsung** ke MCP Titen di `/mcp`, sehingga agent bisa membaca memori sendiri tanpa perantara.
