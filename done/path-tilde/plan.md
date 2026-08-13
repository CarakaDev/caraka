# Plan — path-tilde

**Spec:** [`spec/path-tilde.md`](../spec/path-tilde.md) · **Tanggal:** 13 Agustus 2026

## Langkah

1. **Merah dulu.** Satu test e2e: `@~/<dir sementara>` di DM operator, dengan
   direktori itu benar-benar ada. Hari ini jawabannya `ws.unknown`, dan yang
   diassert adalah kartu penawaran workspace.
2. `src/core/gateway.ts` — satu fungsi murni di dekat `routeTask`, diekspor
   supaya bisa diuji tanpa gateway:

   ```ts
   /**
    * A leading `~/` as a path, because a chat message never passes through a
    * shell and `isAbsolute("~/x")` is false. `~user/` is left alone: another
    * person's home is a guess about the machine, and a wrong guess points at
    * somebody else's directory.
    */
   export function expandHome(token: string, home = homedir()) {
     if (token === "~") return home;
     return token.startsWith("~/") ? join(home, token.slice(2)) : token;
   }
   ```
3. `src/core/gateway.ts`, `routeTask` — token dinormalisasi sekali, lalu cabang
   dipilih dari hasilnya:

   ```ts
   const target = expandHome(token);
   const chosen = isAbsolute(target)
     ? this.workspaceForPath(message, target, rest)
     : this.workspaceBySlug(token);
   ```

   `workspaceBySlug` tetap menerima `token` yang asli: sebuah slug tidak pernah
   diawali `~`, jadi normalisasi tidak boleh ikut mengubah apa yang dicari di
   daftar slug, dan pesan `ws.unknown` tetap mengutip apa yang diketik orang.
   Cabang path menerima `target`, sehingga `resolve`, pemeriksaan direktori,
   `basename` untuk slug, dan baris audit semuanya melihat path yang sudah
   dikembangkan (AC-6, AC-7).
4. `test/e2e.test.ts` dan `test/unit.test.ts` — test per baris tabel di bawah.
5. `docs/session-model.md` §5 dan `docs/frd.md` FR-SESS-02: bentuk yang diterima
   sekarang `@<slug>`, `@<path absolut>`, dan `@~/<path>`.
6. `npm run verify`, lalu gerbang yang sama di `rama-tuf`.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | unit `expandHome("~/Project/Coret", "/home/rama")` sama dengan `/home/rama/Project/Coret` |
| AC-2 | unit `expandHome("~", "/home/rama")` sama dengan `/home/rama` |
| AC-3 | e2e: `@~/<tmpdir>` di DM operator menaikkan kartu penawaran workspace, bukan `ws.unknown`. Gagal sebelum langkah 3 |
| AC-4 | unit: `expandHome("~coret")` dan `expandHome("~root/x")` kembali apa adanya, lalu e2e memastikan `@~coret` dijawab `ws.unknown` |
| AC-5 | e2e: `@~/<tmpdir>` dari grup terpasang dijawab `ws.pathDmOnly`, dan satu baris audit `ws.path` bernilai `denied` |
| AC-6 | e2e, test yang sama dengan AC-3: teks kartu memuat slug `basename` direktori itu, bukan `~` |
| AC-7 | e2e: `@~/tidak-ada-direktori-ini` dijawab `ws.pathMissing` yang memuat path rumah yang sudah dikembangkan dan tidak memuat karakter `~` |
| AC-8 | unit: `expandHome("/srv/~/x")` dan `expandHome("a~/b")` kembali apa adanya |

## Risiko

**Rumah proses, bukan rumah pengetik.** `homedir()` adalah rumah pengguna yang
menjalankan Caraka. Itu memang yang dimaksud: bentuk path hanya berlaku di DM
operator, dan operator itulah yang menjalankan prosesnya. Kalau suatu hari
Caraka berjalan sebagai pengguna sistem tersendiri, `~/` menunjuk rumah pengguna
itu — dan `ws.pathMissing` akan mencetak path yang sudah dikembangkan, jadi
salah paham itu terbaca di kalimat pertama alih-alih menjadi teka-teki.

**Permukaan tidak melebar.** Yang bisa dijangkau `~/x` sudah bisa dijangkau
dengan mengetik path panjangnya hari ini, di percakapan yang sama oleh orang
yang sama. Ini penerjemahan ejaan; gerbangnya tetap `workspaceForPath`, yang
menolak siapa pun selain operator di percakapan pribadinya (AC-5 menguncinya).

**Anggaran.** Diperkirakan +12 baris di `src/`: fungsi beserta komentarnya dan
satu baris di `routeTask`. Perkiraan ini kecil dan disebut kecil karena tidak ada
seam baru yang perlu disuntikkan — `expandHome` murni, dan rumahnya sudah sebuah
parameter. Tiga perkiraan sebelumnya di rilis ini meleset karena biaya seam, dan
di sini biayanya nol.

## Yang berubah dari plan ini saat dikerjakan

**Ada baris kedua yang harus ikut memakai path yang sudah dikembangkan, dan plan
tidak menyebutnya.** Sesudah langkah 3 test tetap merah, dan alasannya bukan
cabang yang salah: `workspaceForPath` sudah berjalan dan sudah menjawab, lalu
penjaga di bawahnya masih membaca `token` yang belum dikembangkan —

```ts
if (!isAbsolute(token)) this.respond(message, this.unknownWorkspace(message, token));
```

`isAbsolute("~/x")` false, jadi jawaban kedua ikut terkirim dan yang terakhir
sampai justru `ws.unknown`. Dua balasan untuk satu pesan. Penjaga itu sekarang
membaca `target`. Yang menemukannya adalah AC-3 yang diassert atas balasan
terakhir, bukan atas ada-tidaknya balasan.

**AC-6 dibuktikan di unit, bukan e2e.** Plan memetakannya ke teks kartu di e2e,
yang menuntut sebuah direktori sungguhan di dalam rumah pengguna yang menjalankan
gerbang. Membuat direktori di rumah orang untuk sebuah test adalah harga yang
tidak sebanding; `basename(expandHome("~/Project/Coret", home))` membuktikan
aturan yang sama tanpa menyentuh apa pun, dan jalur kartunya sendiri sudah
dijaga test path absolut yang sudah ada.

## Keluaran gerbang

Merah dulu, dan pesannya bug itu sendiri:

```
✖ a path written with ~ reaches the path branch, not the slug list
  AssertionError: No workspace is called ~/caraka-tilde-nothing-is-here-1524736. These exist:
  @caraka-tilde-cuDt74 · /tmp/caraka-tilde-cuDt74
    true !== false
```

Sesudah langkah 2 dan 3, keduanya hijau:

```
✔ a path written with ~ reaches the path branch, not the slug list
✔ a leading tilde is a home path, and a tilde anywhere else is not
```

Gerbang penuh, `npm run verify`:

```
clean: 273 tracked files, no credentials
ℹ tests 157
ℹ pass 157
ℹ fail 0
ℹ tests 93
ℹ pass 93
ℹ fail 0
```

157 unit dari 156, dan 93 e2e dari 92.

**Satu kegagalan yang perlu ditulis meski bukan milik pekerjaan ini.** Pada
jalanan pertama gerbang penuh, `a session already holding five questions is
refused the sixth` merah sekali. Ia lolos tiga dari tiga kali saat dijalankan
sendiri, dan dua dari dua kali pada gerbang penuh berikutnya, jadi ia flaky di
bawah beban dan bukan regresi: perubahan di sini sebuah fungsi murni atas string
dan satu penjaga di `routeTask`, yang tidak bersinggungan dengan antrean
approval. Dicatat alih-alih dilewatkan, karena test yang gagal satu dari enam
kali adalah test yang suatu hari akan gagal di mesin orang lain dan dianggap
regresi oleh orang yang tidak melihat catatan ini. Ia pantas mendapat
pekerjaannya sendiri; CHANGELOG v1.2.0 mencatat kelas yang sama pada
`activeGrant`.

**Biaya baris +22**, terhadap perkiraan +12. Selisihnya komentar pada penjaga
kedua yang tidak ada di plan. `src/` 9.598 → 9.620.

### Mesin kedua

`rama-tuf`:

```
host: ra-tuf · Linux 7.0.12-201.fc44.x86_64 · node v24.18.0 · npm 11.16.0
clean: 273 tracked files, no credentials
ℹ tests 157 · pass 157 · fail 0
ℹ tests 93  · pass 93  · fail 0
```

Termasuk test approval yang flaky di atas: ia hijau di sana. Itu bukan bukti ia
tidak flaky, hanya bukti ia tidak merah karena perubahan ini — sebuah test yang
gagal satu dari enam kali memang lebih sering hijau daripada merah.
