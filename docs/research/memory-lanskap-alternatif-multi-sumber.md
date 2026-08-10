# Riset: Lanskap memory layer — pembanding & prinsip desain

**English:** this document is Indonesian only, and stays that way because it is research kept as provenance for a decision already made. English documentation starts at [`../../README.md`](../../README.md).

**Tanggal riset:** 7 Agustus 2026
**Sumber:**
- research.google/blog/titans-miras-helping-ai-have-long-term-memory (paper Titans, arXiv 2501.00663)
- github.com/henryhawke/mcp-titan (Titan Memory MCP Server) + playbooks.com/mcp/henryhawke-titan-memory + skywork.ai deep dive
- marktechpost.com — TencentDB Agent Memory (open source, MIT)
- pingcap.com/blog/agent-memory-database-tidb (pola hybrid BM25 + vector)
- atlan.com/know/mem0-alternatives, contextcloud.pro/blog/best-mcp-memory-servers-for-teams, getunblocked.com/blog/memory-mcp-servers-compared
- agent-memory.dev
- dev.to — "Building a Universal Memory Layer for AI Agents"
- OpenClaw docs: `concepts/memory`, `agent/memory`, `deep-dive/.../memory-state-machine`

---

## ⚠️ 1. Status verifikasi "titen.dev" — **SUDAH TERVERIFIKASI**

> **Pembaruan 7 Agustus 2026:** domain yang dimaksud adalah **`titen.dev`** (bukan `titan.dev`). Sudah diakses dan diverifikasi. Analisis lengkap ada di **`docs/research/titen-memory-titen-dev-github.md`** — dokumen itu yang berlaku.
>
> Ringkasnya: **Titen** adalah *open-source AI agent memory for teams* (Apache-2.0, v0.7.0, `github.com/RamaAditya49/titen`, npm `titen-memory`). Tiga jenis rekaman: **observation → claim → context**, dengan provenance yang dapat dirunut. Self-host Bun + SQLite (FTS5 + sqlite-vec) atau Cloudflare Workers + D1. MCP tersedia di `/mcp`.
>
> **Ekstraksi claim-nya deterministik — belum ada model di dalam loop.** Inilah mode "non-LLM" yang diminta, dan itu perilaku default Titen hari ini, bukan sesuatu yang perlu kita bangun.
>
> Nama berasal dari bahasa Jawa *niteni*: memperhatikan, lalu menyimpan apa yang diperhatikan.

**Keputusan:** `titen` menjadi provider memory **default**; provider `local` turun menjadi fallback minimal. Bagian berikut tetap disimpan sebagai catatan lanskap pembanding dan prinsip desain memory yang masih berlaku.

### Catatan lama (kandidat lain bernama "Titan")

Sebelum verifikasi, kandidat yang sempat dipertimbangkan:

| Kandidat | Apa itu | Cocok dengan maksud user? |
|---|---|---|
| **Titans (Google Research)** | Arsitektur riset: neural long-term memory yang belajar *saat inference* lewat "surprise metric". Varian MAC / MAG / MAL. Diperluas oleh framework MIRAS. | Konsep, bukan API siap pakai |
| **mcp-titan / HOPE** (henryhawke) | Implementasi MCP server dari ide Titans. Memory state + model weights disimpan **lokal** di `~/.titan_memory` / `~/.hope_memory`, **tanpa akses network**. Tools: `init_model`, `bootstrap_memory`, `save_checkpoint`, `load_checkpoint`, `prune_memory`, `forward_pass`. Jalan via `npx @henryhawke/mcp-titan`. | ⭐ Paling mungkin. Ini **memory tanpa LLM** — persis frasa "via non-LLM" |
| **Amazon Titan Embeddings** (`amazon/titan-embed-text-v2`) | Model embedding (dipakai contoh TiDB) | Kemungkinan kecil |
| **Titan Agent** (RyzenXT-hub) | Installer node DePIN, tidak relevan | ❌ |

**Rekomendasi (usang — lihat pembaruan di atas):** jangan kunci arsitektur ke satu vendor. Definisikan **`MemoryProvider` interface** dan jadikan Titen salah satu adapter. Interface tetap dipertahankan; yang berubah hanyalah Titen kini menjadi default, bukan sekadar kandidat.

---

## 2. "Non-LLM" vs "LLM" — apa bedanya secara teknis

User minta memory bisa jalan **tanpa LLM**, dengan LLM sebagai opsi. Ini keputusan arsitektur yang bagus dan punya nama di literatur: pemisahan antara **extraction** (menulis memori) dan **retrieval** (membaca memori).

### Mode NON-LLM (default — murah, deterministik, offline)

| Tahap | Teknik |
|---|---|
| Segmentasi | Pecah transcript per turn/tool-call boundary |
| Ekstraksi fakta | Heuristik + regex + rule: path file yang disentuh, perintah yang dijalankan, nama branch/PR, error signature, keputusan yang ditandai `#decision`, preferensi eksplisit ("selalu pakai pnpm") |
| Embedding | Model lokal (fastembed / all-MiniLM / bge-small) — **bukan** LLM generatif, ±30 MB, jalan di CPU |
| Index | SQLite + FTS5 (BM25) + `sqlite-vec` untuk vektor |
| Retrieval | **Hybrid**: `skor = α·cosine + β·bm25 + γ·recency + δ·pin` |
| Dedup | Cosine > 0.92 → merge, bukan tambah |
| Forgetting | TTL + decay + `prune` saat kapasitas turun |

Catatan penting dari sumber TiDB: jarak vektor itu *lower-is-better*, sedangkan skor BM25 *higher-is-better* — formula hybrid harus mengurangi, bukan menambah. Sumber yang sama menyatakan setup hybrid "hampir selalu mengalahkan" salah satu saja di RAG produksi, dengan biaya satu index tambahan.

**Biaya mode ini: Rp 0 dan tanpa keluar dari mesin user.**

### Mode LLM (opsional — pasang sendiri)

- Ekstraksi fakta terstruktur ("user memilih arsitektur X karena Y")
- Resolusi kontradiksi (fakta lama vs baru)
- Ringkasan sesi + judul sesi
- Sintesis "procedural memory" (strategi berulang)

Trade-off yang tercatat di riset: pipeline add/update berbasis LLM menambah **latensi**; Scira AI dilaporkan pindah dari Mem0 dengan keluhan latensi dan recall. Karena itu: **LLM extraction harus asinkron (job antrian), tidak pernah di jalur kritis balasan chat.**

Bonus: kalau user sudah menjalankan coding agent, LLM-nya sudah tersedia gratis — cukup panggil agent dengan prompt kecil di luar sesi utama, tak perlu API key terpisah.

---

## 3. Tiga jenis memori (jangan digabung jadi satu vector store)

Kesalahan paling umum menurut literatur: menumpuk semuanya di satu vector store sehingga retrieval jadi berisik saat memori tumbuh.

| Jenis | Isi | Contoh untuk kasus kita |
|---|---|---|
| **Episodic** | Kejadian bertimestamp | "3 Feb, minta refactor auth, saya usul middleware, PR merged" |
| **Semantic** | Fakta & relasi | "repo `toko-api` pakai Fastify + Prisma + PostgreSQL" |
| **Procedural** | Strategi/kebiasaan | "selalu jalankan `pnpm test` sebelum commit"; "jangan sentuh `migrations/`" |

Untuk produk kita, tambahkan dua scope:
- **Scope repo/workspace** — memori teknis proyek
- **Scope user** — preferensi lintas proyek (bahasa balasan, gaya commit, jam kerja)

---

## 4. Lanskap pembanding (kalau Titen tidak cocok)

| Produk | Arsitektur | Catatan |
|---|---|---|
| **TencentDB Agent Memory** | 4-tier, symbolic short-term + layered long-term. Backend default **SQLite + sqlite-vec, tanpa API eksternal**. MIT. Sudah punya plugin OpenClaw & adapter Gateway untuk Hermes | ⭐ kandidat fallback lokal terkuat, dan sudah membuktikan pola "plugin memory untuk gateway agent" |
| **Mem0** | Vector store + LLM add/update pipeline | Paling matang & cloud; memori "flat", tanpa type system; ada laporan latensi |
| **Zep / Graphiti** | Temporal knowledge graph | Kuat untuk penalaran waktu; Zep Flex ±$25/bln |
| **Letta** | Self-improving agent memory | |
| **Supermemory** | MCP-native | Setup cepat untuk coding agent |
| **Memori** | SQL-native, versioning temporal, retrieval SQL deterministik, vektor sebagai index sekunder | Cocok untuk kebutuhan auditability |
| **MinnsDB** | Setiap fakta = edge graph dengan validity window (`valid_from`/`valid_until`) + ontologi OWL/RDFS untuk cascade invalidation | Ide bagus untuk "fakta yang kedaluwarsa" |
| **agentmemory** (agent-memory.dev) | Khusus coding agent: BM25 + vector + knowledge graph, rerank on-device, p50 <20ms di laptop, 12 auto-capture hooks, 0 database eksternal | ⭐ referensi desain paling dekat dengan target kita |
| **LangMem, Cognee, Honcho, Hindsight** | Berbagai niche (LangGraph-native, air-gapped, implicit preference, benchmark tinggi) | |

Angka konteks biaya yang layak dikutip di BRD: memproses konteks 10 juta token pada harga 2026 ± **$5 per panggilan inference** — inilah alasan ekonomi keberadaan memory layer.

---

## 5. Pelajaran dari implementasi memory OpenClaw

OpenClaw punya halaman khusus *"Memory (Implementation): backend selection, fallback, healing, scope guard"* dan *"Memory System: Search, Read, Fallback, Injection Limits"*. Dua konsep yang layak kita adopsi mentah-mentah:

1. **Injection limits** — batasi jumlah token memori yang disuntik ke prompt (mis. maks 800 token / 6 item). Tanpa ini, memory justru merusak konteks agent.
2. **Fallback + healing** — kalau backend memory mati, sistem tetap jalan tanpa memori (degraded), lalu menyembuhkan index-nya sendiri di background. **Memory tidak boleh pernah jadi single point of failure untuk membalas chat.**

Selain itu OpenClaw memakai **file markdown di workspace** (`MEMORY.md`, `USER.md`, `AGENTS.md`) sebagai memori yang bisa dibaca manusia. Pendekatan ini murah, transparan, mudah di-backup lewat git — layak jadi **lapisan nol** kita: memory yang bisa dibaca dan diedit user, sebelum apa pun yang berbasis vektor.

---

## 6. Rekomendasi akhir untuk produk

```
MemoryProvider (interface)
├── titen     ← DEFAULT. titen.dev, self-host lokal. Deterministik, non-LLM.
├── local     ← fallback minimal: SQLite + FTS5, tanpa embedding.
├── mcp       ← generik: sambungkan MCP memory server apa pun (mem0, supermemory, TencentDB)
└── none      ← matikan total; agent tetap jalan
```

Operasi minimal: `remember(scope, kind, text, meta)`, `recall(scope, query, k, budget_tokens)`, `forget(id|filter)`, `pin/unpin`, `export()`.

Kebijakan: enrichment LLM **opt-in** dan **asinkron**; hasilnya ditandai `source: llm` supaya bisa dipisah/di-rollback. Di arsitektur final, ini mengikuti roadmap `consolidations` Titen — bukan dibangun sendiri.
