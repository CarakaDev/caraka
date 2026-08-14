# Architecture Decision Records

**English:** this index and the decision records under it are Indonesian only. English documentation starts at [`../../README.md`](../../README.md).

Satu berkas per keputusan besar, dengan alternatif yang ditolak dan alasannya. Formatnya ringkas: konteks, keputusan, konsekuensi.

ADR tidak pernah diedit setelah diterima. Kalau keputusannya berubah, tulis ADR baru yang menggantikannya dan tandai yang lama `Superseded by ADR-XXX`.

| # | Keputusan | Status |
|---|---|---|
| [0001](0001-acp-sebagai-jalur-utama.md) | ACP sebagai jalur utama ke coding agent | Diterima |
| [0002](0002-tidak-ada-agent-loop.md) | Tidak ada agent loop, tool, atau marketplace | Diterima |
| [0003](0003-sesi-sebagai-topic.md) | Satu sesi sama dengan satu forum topic | Diterima |
| [0004](0004-approval-hanya-lewat-callback.md) | Persetujuan hanya lewat callback bertanda tangan | Diterima |
| [0005](0005-titen-sebagai-memory-default.md) | Titen sebagai provider memori default | Diterima |
| [0006](0006-telegram-sebagai-channel-pertama.md) | Telegram sebagai channel pertama dan satu-satunya di v1.0 | Diterima · bagian "satu-satunya" digantikan ADR-0008 |
| [0007](0007-kesumba-sebagai-warna-merek.md) | Kesumba sebagai satu-satunya hue merek | Diterima |
| [0008](0008-discord-sebagai-channel-kedua.md) | Discord sebagai channel kedua, di atas `fetch` dan `WebSocket` | Diterima |
| [0009](0009-approval-lewat-kode-di-channel-tanpa-tombol.md) | Approval lewat kode di channel tanpa tombol, dan dua provider WhatsApp | Diterima |
| [0010](0010-workspace-dari-chat.md) | Workspace baru dari chat: bentuk path hanya di DM operator, di belakang kartu bertanda tangan | Diterima · keputusan 1 "hanya di DM" digantikan ADR-0011 |
| [0011](0011-workspace-dari-ruangan-oleh-operator.md) | Bentuk path dari container mana pun, dari operator saja, dengan kartunya di DM | Diterima |
