# Spec — nested-workspace: folder di dalam workspace berhenti ditolak

**Status:** selesai · **Tanggal:** 14 Agustus 2026

## Latar

Bentuk path yang mendarat di 1.5.0 menolak dua arah tumpang tindih sekaligus,
dan hanya satu di antaranya berbahaya.

`overlapping()` di `src/core/gateway.ts` menolak sebuah path bila ia memuat
workspace yang sudah ada **atau** berada di dalamnya:

```ts
insideWorkspace(root, lower) || insideWorkspace(lower, root)
```

Arah pertama memang harus ditolak: sebuah path yang *memuat* workspace
memperbesar jangkauan, dan itu rooted allowlist yang ADR-0010 tolak dengan
pengukuran — satu jendela trust di atasnya mencakup setiap repositori di
bawahnya.

Arah kedua tidak memberi apa pun yang baru. Sebuah path *di dalam* workspace
sudah terjangkau workspace itu hari ini; menambahkannya menghasilkan kunci yang
lebih sempit, bukan lebih luas.

Yang membuatnya bukan sekadar kelebihan kehati-hatian: `init --workspace "$PWD"`
menulis satu workspace di direktori tempat ia dijalankan, dan pada instalasi
pertama yang mencoba fitur ini workspace itu `~/Project`. Setiap folder kerja
pemiliknya berada di dalamnya, jadi aturan itu menolak seluruh fitur untuk tata
letak yang paling umum. Pesan yang diterimanya, 14 Agustus 2026:

```
/home/ramaaditya/Project/coret overlaps the workspace Project at
/home/ramaaditya/Project, so one trust window would cover both.
```

Yang benar-benar dibayar arah kedua bukan kewenangan melainkan kebingungan: satu
direktori dengan dua scope berarti `/lock` pada salah satunya tidak menutup
jendela yang lain, dan memori yang disimpan di bawah satu tidak muncul di bawah
yang lain. Itu konsekuensi yang pantas dikatakan di kartu, bukan alasan menolak.

## Ruang lingkup

`src/core/gateway.ts` (`overlapping` menyempit ke satu arah, satu pembaca baru
untuk arah yang lain, satu cabang di teks kartu), `src/i18n.ts` (satu pasang
kalimat), `test/unit.test.ts`, dan `docs/adr/0011-workspace-dari-ruangan-oleh-operator.md`.

## Yang tidak dikerjakan

- **Tidak melonggarkan arah yang memperluas.** Sebuah path yang memuat workspace
  tetap ditolak, tetap dengan pelipatan huruf, dan tetap diperiksa ulang saat
  kartu ditekan.
- **Tidak menggabungkan scope.** Dua workspace bersarang tetap dua kunci: dua
  jendela trust, dua scope memori. Menyatukannya perubahan yang jauh lebih besar
  dan tidak diminta siapa pun.
- **Tidak mengubah `/lock`** supaya ikut menutup jendela workspace induk. Itu
  perkara tersendiri dan pantas punya spec sendiri.
- **Tidak menyentuh containment symlink dan bind mount**, yang ADR-0010 memang
  tidak pernah janjikan.

## Acceptance criteria

- **AC-1** WHEN sebuah path yang memuat workspace yang sudah ada diusulkan,
  Caraka shall menolaknya dan tidak menggambar kartu.
- **AC-2** WHEN sebuah path yang berada di dalam workspace yang sudah ada
  diusulkan, Caraka shall menggambar kartu konfirmasi.
- **AC-3** WHEN kartu untuk path bersarang digambar, teksnya shall menyebut
  workspace yang memuatnya.
- **AC-4** WHEN kartu untuk path bersarang digambar, teksnya shall menyebut
  bahwa direktori itu mendapat scope kedua.
- **AC-5** WHILE dua ejaan berbeda huruf besar-kecil menunjuk satu direktori,
  WHEN path yang memuat workspace diusulkan, Caraka shall tetap menolaknya.
- **AC-6** Setiap kalimat baru shall ada di kedua katalog.
