# Security

**Produk:** Caraka · **Versi:** 0.1 · **Tanggal:** 7 Agustus 2026
**Riset pendukung:** `docs/research/keamanan-agent-remote-arxiv-openclaw-acp.md`

---

## 1. Postur keamanan dalam satu paragraf

Caraka menghubungkan **input tak tepercaya** (chat) ke **eksekusi kode di mesin developer**. Itu kombinasi paling berbahaya dalam sistem agentic. Strategi kami bertumpu pada satu keunggulan struktural: **kami tidak menambah permukaan eksekusi baru** — semua eksekusi terjadi di dalam coding agent yang sudah punya sandbox, permission model, dan diff review sendiri. Tugas kami hanya menjaga tiga gerbang: **siapa** yang boleh bicara, **apa** yang boleh dijalankan, dan **apa** yang boleh keluar.

---

## 2. Trust boundary

```
  UNTRUSTED                     │  TRUSTED
  ──────────────────────────────┼──────────────────────────────
  isi pesan chat                │  config.yaml
  konten web/repo yang dibaca   │  keputusan lewat tombol bertanda
  isi memori yang di-recall     │  perintah dari terminal lokal
  output MCP pihak ketiga       │  allowlist principal
```

**Aturan tunggal yang menyatukan semuanya:** apa pun yang berasal dari kolom UNTRUSTED **tidak akan pernah** dapat mengubah kebijakan, menyetujui aksi, atau menaikkan hak.

---

## 3. Ancaman & kontrol

| # | Ancaman | Kontrol utama | Kontrol cadangan |
|---|---|---|---|
| T1 | Orang asing mengirim perintah | Allowlist wajib; gateway menolak start bila kosong | Pairing disetujui dari terminal, bukan chat |
| T2 | Prompt injection langsung | Approval berbasis tombol + nonce; teks tidak bisa menyetujui | Mode default `assisted` |
| T3 | Prompt injection tidak langsung (README/issue/web) | Konten eksternal & memori diberi label **data, bukan instruksi** | Aksi berisiko selalu minta konfirmasi walau mode `trusted` |
| T4 | Eksfiltrasi rahasia lewat balasan | **Outbound scrubber** wajib sebelum kirim & sebelum tulis disk | Deny-list path (`~/.ssh`, `~/.aws`, `*.env`, keychain) |
| T5 | Aksi destruktif | Daftar aksi berisiko tinggi (force push, `rm -rf`, migrasi, deploy) selalu butuh approval | Timeout run + `/stop` |
| T6 | Kebocoran di grup | Grup default `read-only` + `requireMention` | **Ephemeral messages** (`receiver_user_id`) untuk semua output sensitif; tool tulis/eksekusi dinonaktifkan di grup |
| T7 | Gateway terekspos internet | Bind `127.0.0.1` saja; membuka butuh flag eksplisit + peringatan | Akses jauh hanya lewat Tailscale/WireGuard/SSH |
| T8 | Supply chain plugin | **Tidak ada marketplace, tidak ada dynamic loading** | Dependensi ≤ 25, audit di CI |
| T9 | Ban akun WhatsApp | Dua provider; `allowFrom` wajib; rate limit + jitter; tanpa first-contact | Cloud API sebagai jalan keluar |
| T10 | Biaya lepas kendali | Concurrency 1 run/workspace; timeout 30 mnt; heartbeat mati default | Batas harian opsional + notifikasi |
| T11 | Tidak bisa diaudit | Audit append-only sejak hari pertama | `caraka audit` + retensi |
| T12 | Memory poisoning | Memori berlabel data; injection limit 6 item/800 token; `source` tercatat | `/lupakan`, `supersede` Titen, trace ke bukti, export & review |
| T13 | Spoofing tombol approval | `callback_data` maks 64 byte → simpan payload di DB, kirim id + HMAC | Nonce terikat `(principal, session, request)` |

---

## 4. Kontrol wajib (tidak bisa dimatikan)

Ini adalah kontrol yang **tidak** punya opsi konfigurasi untuk dinonaktifkan:

1. **Allowlist tidak boleh kosong** — gateway berhenti dengan pesan cara memperbaiki.
2. **Approval hanya lewat callback bertanda tangan** dengan nonce sekali pakai + TTL. Fallback teks (`ok A7F3`) juga terikat nonce.
3. **Mode `trusted` hanya dari terminal lokal** dan **wajib kedaluwarsa** (constraint level database).
4. **Outbound scrubber** selalu aktif.
5. **Audit log** selalu aktif untuk keputusan otorisasi.
6. **Grup tidak pernah mendapat izin tulis/eksekusi** tanpa opt-in eksplisit; output sensitif di grup selalu **ephemeral**.
7. **Bind default `127.0.0.1`.**
8. **Payload callback tidak pernah dipercaya apa adanya** — selalu id + HMAC + nonce yang tervalidasi di server.

### Dua lapisan izin di Telegram
Sejak Mei 2026, user dapat menetapkan **access whitelist granular untuk bot-nya langsung di @BotFather**. Onboarding menyarankannya: bot bahkan tidak menerima update dari orang asing, sebelum allowlist kita sempat bekerja. Dua lapisan, dua vendor — satu-satunya kontrol berlapis yang tidak menambah kode di sisi kita.

---

## 5. Model kebijakan

| Mode | Baca | Tulis | Eksekusi | Git push | Deploy/migrasi |
|---|---|---|---|---|---|
| `read-only` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `assisted` **(default DM)** | ✅ | ⚠️ approval | ⚠️ approval | ❌ | ❌ |
| `trusted` (kedaluwarsa, dari terminal) | ✅ | ✅ | ✅ | ⚠️ approval | ⚠️ approval |
| grup **(default)** | ✅ | ❌ | ❌ | ❌ | ❌ |

**Daftar aksi berisiko tinggi** (selalu approval, apa pun modenya):
`git push --force*` · `git reset --hard` · `rm -rf` · penghapusan direktori · migrasi database · `terraform apply` · `kubectl apply/delete` · perintah deploy · menulis ke `~/.ssh`, `~/.aws`, `~/.config`, `*.env`, `*.pem`, `id_*` · perintah dengan pipe ke `sh`/`bash` · `curl`/`wget` ke domain tidak dikenal.

---

## 6. Penanganan rahasia

**Yang tidak pernah kami sentuh:** API key model. Itu milik coding agent. Caraka tidak punya, tidak meminta, tidak menyimpan.

**Yang kami simpan:** kredensial channel (bot token Telegram; nanti session Baileys / access token Cloud API) → keychain OS bila tersedia; fallback file `chmod 600` di `~/.caraka/secrets/`. Tidak pernah masuk repo, tidak pernah ke log, tidak pernah ke chat, **tidak pernah ditulis ke `config.yaml`**.

**Kenapa Managed Bots tidak dipakai sebagai jalur default:** Bot API 9.6 memungkinkan setup satu ketukan, tetapi token bot mengalir melalui *manager bot* — artinya pihak ketiga sempat memegang kredensial user. Itu bertentangan langsung dengan prinsip di atas. Ditawarkan hanya sebagai opsi eksplisit, dan hanya bila manager bot dijalankan sendiri oleh user.

**Outbound scrubber** — pola yang diredaksi sebelum keluar:
```
sk-[A-Za-z0-9]{20,}          ghp_[A-Za-z0-9]{36}      github_pat_[A-Za-z0-9_]{50,}
AKIA[0-9A-Z]{16}             xox[baprs]-[A-Za-z0-9-]+  eyJ[A-Za-z0-9_-]+\.[...]\.[...]
-----BEGIN [A-Z ]*PRIVATE KEY-----   .*
baris dalam file .env / .env.*
```
Diganti menjadi `[redacted:<jenis>]`. **Ini kontrol paling murah dengan dampak terbesar** — pasang sejak commit pertama.

---

## 7. Isolasi eksekusi

Prinsip: **warisi, jangan bangun ulang.**

| Lapisan | Sumber |
|---|---|
| Sandbox eksekusi | Bawaan agent (mis. preset Codex kami memakai `--sandbox read-only` secara default) |
| Batas direktori | `cwd` dikunci ke root workspace; path di luar workspace dianggap aksi berisiko tinggi |
| Deny-list path | Kebijakan kami, diterapkan sebelum approval ditawarkan |
| Isolasi kuat (opsional) | Jalankan agent di container/VM per workspace — didokumentasikan, tidak diwajibkan |

---

## 8. Jaringan

- Default bind `127.0.0.1`. Flag `--bind 0.0.0.0` mencetak peringatan besar dan mencatat audit event.
- Webhook (WhatsApp Cloud API): verifikasi `X-Hub-Signature-256` wajib; tolak request tanpa signature valid; reverse proxy dengan TLS.
- Telegram: long-polling sebagai default (tidak butuh port terbuka sama sekali) — inilah alasan tambahan menjadikan Telegram channel pertama. **Di v1.0 tidak ada webhook sama sekali**, sehingga seluruh kelas risiko "port terbuka ke internet" tidak berlaku.
- Titen dijalankan lokal (`127.0.0.1:7717`); bila user memilih instans remote, onboarding menyatakan secara eksplisit bahwa data memori akan meninggalkan mesin.
- Tidak ada telemetri keluar. Tanpa pengecualian.

---

## 9. Rate limit & pembatasan

| Batas | Default |
|---|---|
| Pesan per sender | 20/menit |
| Run bersamaan | 1 per workspace |
| Durasi run | 30 menit |
| Approval pending | 5 per sesi |
| Outbound per channel | mengikuti batas channel + jitter |
| Ukuran lampiran masuk | 25 MB |

Melebihi batas → pesan jelas + antrean, bukan diam-diam dibuang.

---

## 10. Privasi

- Semua data lokal. Tidak ada layanan cloud dalam jalur default.
- Transcript diredaksi sebelum disimpan; retensi default 90 hari, dapat diatur.
- Memori dapat diinspeksi (`/memori`), dihapus (`/lupakan`), diekspor, dan **dirunut ke buktinya** — setiap claim Titen menyebut observation asalnya (`GET /v1/claims/:id/evidence`), sehingga "kenapa agent tahu ini?" selalu punya jawaban.
- Titen menyimpan data secara lokal (Bun + SQLite) dan memakai format ekspor yang sama di semua mode — data dapat dibawa keluar kapan saja.
- `NOTES.md` per workspace sengaja berupa file teks biasa — user bisa membaca dan mengedit apa yang "diingat" sistem tentang proyeknya.
- Provider memory remote (Titen instans jauh / MCP) bersifat opt-in dan onboarding harus menyatakan bahwa data akan meninggalkan mesin.

---

## 11. Respons insiden

1. `caraka stop` menghentikan semua channel dan proses agent.
2. `caraka pair revoke --all` mencabut seluruh identitas.
3. Audit log memberi jejak lengkap: siapa, kapan, aksi apa, disetujui siapa.
4. Rotasi kredensial channel didokumentasikan sebagai runbook.
5. `SECURITY.md` di repo dengan jalur pelaporan privat + target respons 72 jam.

---

## 12. Yang kami TIDAK klaim

Kejujuran adalah bagian dari postur keamanan:

- Kami **tidak** menjamin agent tidak akan melakukan hal bodoh setelah kamu menyetujuinya.
- Kami **tidak** bisa mencegah prompt injection sepenuhnya — kami hanya memastikan konsekuensinya membutuhkan ketukan manusia.
- Kami **tidak** bisa mencegah WhatsApp memblokir nomormu bila memakai provider tidak resmi.
- Kami **tidak** melakukan audit keamanan pihak ketiga (belum); status ini akan dinyatakan terbuka sampai berubah.

---

## 13. Checklist sebelum rilis publik

- [ ] Scrubber punya test dengan corpus rahasia sintetis
- [ ] Nonce approval diuji terhadap replay & cross-session
- [ ] Fuzzing parser pesan masuk (teks aneh, unicode, panjang ekstrem)
- [ ] Uji: pesan berisi instruksi injeksi tidak pernah menghasilkan eksekusi tanpa tombol
- [ ] Uji: mode `trusted` tidak dapat diaktifkan dari chat mana pun
- [ ] Uji: kartu approval di grup benar-benar tidak terlihat oleh anggota lain (ephemeral)
- [ ] Uji: `callback_data` yang dipalsukan/di-replay ditolak
- [ ] `npm audit` bersih + dependensi dikunci
- [ ] `SECURITY.md`, kebijakan disclosure, dan halaman risiko WhatsApp tersedia
- [ ] Default config yang dikirim = konfigurasi teraman, bukan yang paling nyaman
