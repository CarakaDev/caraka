# Rencana contributor ariekoprasethio

1. Periksa akun GitHub, izin pengelola, izin pengguna, dan undangan yang masih berlaku.
2. Kirim undangan dengan `permission=push`; periksa undangan serta izin aktif untuk AC-2 dan AC-3.
3. Tambahkan tautan profil pada bagian kontribusi kedua README untuk AC-1.
4. Jalankan `git diff --check` dan `npm run verify` sesuai gerbang repositori.
5. Arsipkan spec dan plan, commit perubahan, lalu push ke `main` tanpa force.
6. Baca kedua README dari GitHub untuk AC-4 dan periksa status undangan kembali.

Risiko: daftar contributor otomatis mengikuti commit, sedangkan undangan collaborator mengatur akses.
Tautan profil eksplisit memenuhi pencantuman README tanpa bergantung pada daftar otomatis.
Worktree terpisah memakai `origin/main` terbaru; perubahan README sebelumnya tetap tersimpan di checkout asal.

## Bukti GitHub awal

- Akun pengelola `RamaAditya49` mempunyai izin admin pada `CarakaDev/caraka`.
- Undangan `334131236` tercatat untuk `ariekoprasethio` dengan izin `write` dan `expired=false`.
- Izin aktif masih `read`; undangan masih menunggu penerimaan pengguna.

## Verifikasi

Pada 22 September 2026, `npm run verify` selesai dengan kode keluar `0`.
Berikut petikan keluaran gerbang; log lengkap tersimpan di `/tmp/caraka-contributor-verify.RpDA08.log`.

```text
clean: 362 tracked files, no credentials
npm notice run caraka@1.6.0 lint
Finished in 158ms on 51 files using 24 threads.
npm notice run caraka@1.6.0 typecheck
npm notice run tsc -p tsconfig.json --noEmit
npm notice run caraka@1.6.0 build
npm notice run caraka@1.6.0 test
ℹ tests 191
ℹ pass 191
ℹ fail 0
ℹ skipped 0
npm notice run caraka@1.6.0 web
ℹ tests 31
ℹ pass 31
ℹ fail 0
ℹ skipped 0
npm notice run caraka@1.6.0 e2e
ℹ tests 139
ℹ pass 139
ℹ fail 0
ℹ skipped 0
npm notice run caraka@1.6.0 web:browser
  18 passed (11.3s)
npm notice run caraka-site@0.0.1 test
 Test Files  2 passed (2)
      Tests  35 passed (35)
```

`git diff --cached --check` selesai dengan kode keluar `0`.
Pemeriksaan kedua README menemukan satu tautan profil pada bagian kontribusi masing-masing dokumen.
