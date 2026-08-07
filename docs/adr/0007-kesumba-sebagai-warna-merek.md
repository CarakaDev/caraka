# ADR-0007 — Kesumba sebagai satu-satunya hue merek

**Status:** Diterima · **Tanggal:** 7 Agustus 2026

## Konteks

Warna aksen sebelumnya, biru `#6FB9F0`, hanya mencapai 1,91:1 terhadap bookmark bar mode terang. Ambang praktisnya 3:1.

Biru juga menempati 37–41% logo merek besar, dan Telegram sendiri biru, jadi ikon Caraka akan selalu duduk di sebelahnya.

## Keputusan

Kesumba `#E2452C` menjadi satu-satunya hue merek. Secondary diambil dari netral dingin, tertiary dari kesumba berchroma sangat rendah. Bukan hue baru.

## Konsekuensi

Dari lima kandidat yang diuji, hanya kesumba yang lolos ambang di chrome terang (3,68) dan gelap (3,50) sekaligus.

Penyisiran seluruh 360° roda warna mencari hue kedua dan ketiga hanya menghasilkan ΔE 13,2, di bawah ambang aman 15. Enam warna status Telegram sudah memenuhi ruang warna.

Status `failed` bergeser dari merah `#FB6F5F` ke magenta `#FF93B2`, karena jarak merah ke kesumba hanya ΔE 9,9.

Kesumba 500 tidak boleh dipakai untuk teks, hanya 4,89:1 di atas void. Teks memakai kesumba 400.

## Alternatif yang ditolak

**Kunyit, jamrud, nila.** Masing-masing gagal di salah satu mode chrome.

**Mempertahankan biru.** Gagal terukur di bookmark bar terang, dan bertabrakan dengan Telegram.
