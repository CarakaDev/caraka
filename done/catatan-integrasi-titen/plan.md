# Plan — catatan-integrasi-titen

**Spec:** `spec.md` di direktori ini · **Tanggal:** 10 Agustus 2026

## Langkah

1. Hitung ulang di mesinnya: `find /home/ramaaditya -name titen.db -not -path
   '*/node_modules/*' -printf '%TY-%Tm-%Td %p\n'`.
2. Periksa `~/.claude.json` dengan `jq`, hanya nama kunci `env` dan `headers`,
   tidak pernah nilainya.
3. Periksa keberadaan `.mcp.json` di `/home/ramaaditya/Project/caraka`,
   `/home/ramaaditya/Project/caraka/caraka`, `/home/ramaaditya/Project`, dan
   `/home/ramaaditya`.
4. Tunggu commit hulu ada, lalu kutip hash-nya di paragraf "Perbaikannya".
5. Pindahkan temuan konfigurasi ke narasi "Seberapa jauh sudah dipersempit",
   dan tinggalkan di daftar "tidak ada sumbernya" hanya batas yang masih
   terbuka: host MCP selain Claude Code.
6. Koreksi `docs/roadmap.md` Fase 3 dan `done/mcp-titen-passthrough/spec.md`
   (paragraf di bawah tabel dan baris tabelnya).
7. Terapkan setiap perubahan di kedua bahasa.

## Pemetaan AC → pembuktian

| AC | Pembuktian |
|---|---|
| AC-1 | `git log --oneline -1` di `/home/ramaaditya/Project/titen` → `ec7060d`; paragraf mengutipnya |
| AC-2 | Keluaran `find` di bawah: 14 berkas, 14 direktori, satu bertanggal 10 Agustus |
| AC-3 | Keluaran `jq` di bawah; diff kedua berkas catatan |
| AC-4 | `find` `.mcp.json` di empat direktori → semua `absent`; diff roadmap dan spec passthrough |
| AC-5 | Kalimat penolakan dibaca ulang: alasannya 12 dari 18 tool, tidak menyebut tabel |
| AC-6 | `git diff --stat` menunjukkan kedua berkas catatan bergerak bersama |

## Risiko

Koreksi terhadap `done/` bisa terbaca sebagai menulis ulang riwayat. Ditangani
dengan menandainya sebagai koreksi bertanggal di dalam berkas yang sama, dengan
kalimat asli tetap terbaca di paragraf di atasnya.

## Keluaran gerbang

`find` di mesin uji:

```
2026-08-01  backups/titen/pre-0.5.0-20260801T1602/titen.db
2026-08-01  backups/titen/pre-0.5.2-20260801T104600Z/titen.db
2026-08-01  backups/titen/pre-enterprise-20260801T1500/titen.db
2026-08-01  .local/share/containers/storage/volumes/titen-canary-053-4aa9255-data/_data/titen.db
2026-08-01  .local/share/containers/storage/volumes/titen-data/_data/titen.db
2026-08-01  .local/share/containers/storage/volumes/titen-rollback-052-ea44de3-data/_data/titen.db
2026-08-02  canaries/titen-0.5.7-f226df0-20260801T200903Z/titen.db
2026-08-04  .local/share/containers/storage/volumes/titen-data-050-30fadbd/_data/titen.db
2026-08-04  titen-bench-057-run/lane-perf-run/data-res/titen.db
2026-08-04  titen-bench-057-run/lane-perf-run/data/titen.db
2026-08-04  titen-bench-057-run/lane-perf-run/data-vec/titen.db
2026-08-04  titen-bench-057-run/lane-verify-20-repro/titen.db
2026-08-04  titen-lifecycle-20260804/drill/titen.db
2026-08-10  titen.db
```

`jq` atas `~/.claude.json`, nama kunci saja:

```
user-scope titen: command=/home/ramaaditya/.bun/bin/titen args=mcp envKeys=TITEN_API_KEY,TITEN_MCP_URL
project /home/ramaaditya/Project/caraka: command=/home/ramaaditya/.bun/bin/titen args=mcp envKeys=[] headerKeys=[]
```

`.mcp.json` di empat direktori yang relevan:

```
/home/ramaaditya/Project/caraka: absent
/home/ramaaditya/Project/caraka/caraka: absent
/home/ramaaditya/Project: absent
/home/ramaaditya: absent
```

Commit hulu yang dikutip:

```
$ git -C /home/ramaaditya/Project/titen log --oneline -1
ec7060d fix: a bridge without its environment read another store and named it nowhere
```

`npm run verify`, pada pohon yang sudah memuat koreksi ini dan perubahan di
`done/gerbang-rahasia/`:

```
> caraka@1.2.0 scan:secrets
clean: 251 tracked files, no credentials
> caraka@1.2.0 lint
> caraka@1.2.0 typecheck
> caraka@1.2.0 test
ℹ tests 113
ℹ pass 113
ℹ fail 0
> caraka@1.2.0 e2e
ℹ tests 62
ℹ pass 62
ℹ fail 0
> caraka@1.2.0 build
exit 0
```

Perubahan ini hanya menyentuh Markdown, jadi lint, typecheck, test, e2e, dan
build membuktikan bahwa ia tidak merusak apa pun, bukan bahwa isinya benar.
Yang membuktikan isinya benar adalah empat keluaran di atasnya, semuanya diambil
ulang di mesin yang sama pada hari yang sama.

Prosa dicek terhadap *Writing style* di `AGENTS.md`.
