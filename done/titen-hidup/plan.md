# Plan — adapter Titen terhadap Titen hidup

**Slug:** titen-hidup · **Spec:** `spec/titen-hidup.md`

## Langkah

1. Jalankan Titen 0.7.3 di host pengembangan, ambil kuncinya dari `titen
   bootstrap`, dan tabrakkan setiap rute dengan `curl` sampai ia berhenti
   menolak. Catat penolakannya, bukan hanya hasil akhirnya.
2. Tulis ulang `src/memory/titen.ts` terhadap catatan itu. Header berkasnya
   memuat penolakan per field, supaya bentuk yang salah tidak lahir lagi.
3. Pindahkan konstanta endpoint ke adapter dan impor dari `src/config.ts`.
   Salinan kedua di config-lah yang selama ini dipakai setiap install.
4. Ganti nama variabel kunci menjadi `CARAKA_TITEN_API_KEY`, dan tambahkan ke
   `startupSecrets()`.
5. Ganti penyelidikan doctor dari `/healthz` menjadi rute `/v1` hanya-baca.
6. Beri `scripts/smoke-cli.mjs` argumen rute, lalu jalankan `claude-code cli`.
7. Jalankan smoke untuk `codex`, `aider`, `goose`; perbaiki presetnya sampai
   lulus atau catat kenapa berhenti.
8. Sisir setiap dokumen dan string yang menyebut `7717` atau `/health`.
9. Jalankan keempat gerbang, tempel keluarannya di bawah.

## Berkas yang disentuh

`src/memory/titen.ts`, `src/config.ts`, `src/cli.ts`, `src/i18n.ts`,
`src/dashboard/server.ts` (komentar saja), `test/unit.test.ts`,
`scripts/smoke-cli.mjs`, `package.json`, `presets/agents/*.yaml`,
`.github/workflows/ci.yml`, `AGENTS.md`, `CHANGELOG.md`, `README.md`,
`llms.txt`, `docs/design.md`, `docs/roadmap.md`, `docs/security.md`(+`.en`),
`docs/troubleshooting.md`(+`.en`), `docs/session-model.md`.

## Risiko

- **Titen pra-1.0.** Permukaannya bisa bergerak, dan adapter ini terikat pada
  0.7.3. Yang mengurangi biayanya: setiap field sekarang punya catatan
  penolakannya, jadi versi berikutnya diperiksa terhadap daftar, bukan
  terhadap tebakan.
- **Mengganti nama variabel kunci** membuat pemilik yang sudah mengekspor
  `TITEN_API_KEY` kehilangan memorinya diam-diam. Yang menahannya: baris doctor
  yang menyelidik rute berkredensial, sehingga kunci yang hilang muncul merah
  dengan perintahnya.
- **Satu run bukan bukti stabil.** Empat agent lulus sekali. Preset yang lulus
  hari ini bisa gagal pada rilis binernya berikutnya, dan tidak ada CI yang
  menangkapnya (`.github/workflows/ci.yml` menjelaskan kenapa).

## Pemetaan AC → pembuktian

| AC | Dibuktikan oleh |
|---|---|
| AC-1.1 | unit: `the memory block accepts its providers…` — config tanpa `endpoint` memberi `TITEN_DEFAULT_ENDPOINT`; dan `a config file from before v0.3…` |
| AC-1.2 | unit: `TITEN_DEFAULT_ENDPOINT` diimpor dari `src/memory/titen.ts` dan dibandingkan dengan `http://127.0.0.1:8787`; typecheck gagal kalau ekspornya hilang |
| AC-2.1, AC-2.2 | unit: `the titen adapter sends what titen accepts…` menegaskan `authorization: Bearer k`. Manual: `live-check.mjs` di host pengembangan |
| AC-2.3 | unit: `a spawned agent inherits nothing Caraka named to itself` memuat `CARAKA_TITEN_API_KEY` |
| AC-2.4 | tinjauan kode `startupSecrets()`; nilainya kosong di CI, jadi tidak ada test yang bisa memaksanya tanpa menaruh rahasia di runner |
| AC-3.1, AC-3.2, AC-3.3, AC-3.5, AC-3.6, AC-3.7 | unit: test adapter yang sama, per field |
| AC-3.4 | unit: `compile` dengan `task: ""` dan `task: "   "` — badan yang keluar tidak boleh kosong |
| AC-4.1, AC-4.2, AC-4.3 | manual: `live-check.mjs` menyelidik dua kali, dengan dan tanpa kunci (`404` / `401`); rute mati diselidik dengan endpoint yang tidak dilayani |
| AC-5.1 | manual: `node scripts/smoke-cli.mjs claude-code cli` di host pengembangan |
| AC-5.2 | unit: empat assert di test preset |
| AC-5.3 | unit: himpunan berkas dengan `^# belum diverifikasi` dibandingkan dengan `["amp","cursor","gemini"]` |
| AC-6.1 | manual: `grep -rn 7717` dan `grep -rn "/health\b"` di luar `done/`, `design/mockups/`, dan entri changelog historis |
| AC-6.2, AC-6.3 | tinjauan prosa terhadap *Writing style* di `AGENTS.md` |

## Keluaran verifikasi

Keempat gerbang, dibaca dari exit code, 10 Agustus 2026:

```
$ npm run lint;      echo "lint=$?"        lint=0
$ npm run typecheck; echo "typecheck=$?"   typecheck=0
$ npm test;          echo "test=$?"        test=0
$ npm run e2e;       echo "e2e=$?"         e2e=0
```

`npm test` melaporkan `tests 113 · pass 113 · fail 0`. Sebelum pekerjaan ini ia
melaporkan `pass 112 · fail 1`: test preset menegaskan `aider.yaml` memuat
`belum diverifikasi`, dan wave yang menjalankan aider menghapus penandanya.

Smoke hidup di host pengembangan (Titen 0.7.3 berjalan, Claude Code masuk):

```
$ node scripts/smoke-cli.mjs claude-code cli
claude-code cli smoke passed via /…/claude: answered "ready",
resumed by `-p --output-format json --resume {sessionId}` in the workspace,
recalled 5504.
```

Adapter terhadap Titen hidup, lewat `dist/` yang sudah dibangun:

```
DEFAULT_ENDPOINT = http://127.0.0.1:8787
observe -> obs_b7c3717dabf1403ab9f4b569a4fa2125
compile(task:"") -> 0 item(s), 0 tokens, 4 ms
compile(task:"…") -> 0 item(s), 0 tokens, 5 ms
feedback -> ok
forget -> 1
doctor probe with key   -> 404
doctor probe without    -> 401
```

`0 item` pada kedua `compile` bukan kegagalan: subject itu punya observation dan
tidak punya claim, dan itulah bentuk keterbatasan yang dicatat di bawah. Yang
dibuktikan barisnya adalah `task: ""` tidak lagi dijawab `400`.

## Yang tersisa terbuka

- `site/src/data/status.ts:156` dan `site/src/data/landing.ts` masih memuat
  kalimat "Titen was never contacted" dan hitungan dua-agent. Di luar lingkup
  ini; berkas `site/` dipegang pekerjaan lain.
- Konsolidasi. Selama tidak ada yang menulis claim, `provider: titen` menyimpan
  dan tidak mengembalikan apa pun.
