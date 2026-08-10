# ADR-0008 — Discord sebagai channel kedua, di atas `fetch` dan `WebSocket`

**English:** this document is Indonesian only, and stays that way because an accepted decision record is never rewritten. English documentation starts at [`../../README.md`](../../README.md).

**Status:** Diterima · **Tanggal:** 8 Agustus 2026
**Menggantikan:** kalimat "Telegram menjadi satu-satunya channel di v1.0" pada [ADR-0006](0006-telegram-sebagai-channel-pertama.md). Sisa ADR-0006 tetap berlaku.

## Konteks

ADR-0006 mengunci satu channel sampai v1.0 supaya permukaan tidak berlipat sebelum satu pun terbukti. Fase 5 roadmap menanyakan hal yang berbeda: apakah produk ini bertahan di tangan orang lain. Pertanyaan itu tidak bisa dijawab oleh satu channel, karena yang diuji bukan Telegram melainkan apakah core benar-benar tidak tahu channel mana yang menjawab.

Sampai v0.4 aturan "core tidak pernah bercabang atas `channel.id`" lolos di dalam vakum. `grep caps src/` mengembalikan nol baris, `src/channels/` berisi satu berkas, dan gateway memegangnya sebagai tipe konkret. Tidak ada `channel.id` untuk dicabangkan karena tidak ada `channel`.

## Keputusan

Discord mendarat di v0.5 sebagai channel kedua, lewat interface yang sama (`src/core/channel.ts`), dan interface itulah alasan sebenarnya ia mendarat sekarang.

Adapternya ditulis di atas `fetch` bawaan dan `WebSocket` global Node 22, bukan `discord.js` yang dipilih `docs/techstack.md` §5. Permukaan yang dipakai adalah satu koneksi gateway dan sekitar sepuluh endpoint REST; `discord.js` membawa cache entitas, sharding, voice, dan builder yang tak satu pun dibaca. Preseden Telegram sudah menunjukkan bentuk itu bekerja: 302 baris `fetch` polos menangani long-poll, 429, topic, hasil kaya, edit progres, dan callback tanpa framework.

Satu Gateway memegang daftar channel, bukan satu proses per channel. Slot run dikunci per slug workspace, jadi dua Gateway di satu mesin berarti dua peta antrean dan dua run yang bisa berjalan bersamaan di satu workspace.

Role Discord tidak pernah memberi otoritas approval. Approval tetap terikat principal pemilik sesi, sesuai ADR-0004.

## Konsekuensi

Dependensi runtime tetap empat, dan target ukuran terpasang NFR-05 tidak bergerak. Janji "channel dimuat malas" di `docs/techstack.md` §11 berhenti menjadi aspirasi: modul Discord hanya di-`import()` bila blok `discord:` ada di config.

Yang dibayar: bentuk payload Discord, perilaku 429 nyata, dan izin nyata tidak terbukti di mesin ini, karena mesin ini tidak memegang kredensial Discord. Bukti turun ke unit dan e2e dengan gateway dan REST ter-mock. CHANGELOG 0.5.0 menyebutnya apa adanya.

Yang juga dibayar: `caps` mengecil dari delapan menjadi tiga. `edit`, `files`, `typing`, `rich`, dan `ephemeral` tidak punya satu pun pembaca di core, dan mendeklarasikan kemampuan yang tidak dibaca melanggar syarat kejujuran `docs/api.md` §4 sendiri.

## Alternatif yang ditolak

**`discord.js`.** Lihat di atas. Kalau kelak Caraka butuh voice, sharding, atau cache entitas, keputusan ini ditinjau ulang dengan ADR baru — bukan dengan menambah dependensi diam-diam.

**Forum channel Discord.** Ia mewajibkan judul dan tag per post dan tidak menyisakan channel induk sebagai tempat perintah global dijawab. Text channel dengan public thread memetakan satu-lawan-satu ke model yang sudah jalan: channel induk = topic General, thread = sesi.

**Menunggu sampai v1.0 sesuai ADR-0006.** Menunda channel kedua berarti menunda satu-satunya bukti bahwa seam-nya benar. Interface dengan satu implementasi adalah interface yang belum diuji.

**Role sebagai otoritas approval,** sebagaimana terbaca di `docs/roadmap.md` Fase 5 dan `docs/ui-ux.md` §5. Sebuah role adalah properti guild, bukan bukti bahwa penekan tombol adalah orang yang meminta pekerjaan itu. Pemetaan role → mode kebijakan (FR-AUTH-06) menyusul bersama gerbang modenya, yang belum ada di jalur run untuk channel mana pun.
