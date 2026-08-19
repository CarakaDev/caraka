# Plan — skill-lewat-commands

**Spec:** [`../spec/skill-lewat-commands.md`](../spec/skill-lewat-commands.md)

## Langkah

0. **Buktikan dulu bahwa perintahnya sudah ada**, karena seluruh sisanya
   bergantung pada itu. Yang dibaca adalah adapter yang dipasang paket ini,
   bukan dokumentasi tentangnya:
   `node_modules/@agentclientprotocol/claude-agent-acp/dist/acp-agent.js`.
   `getAvailableSlashCommands()` memetakan apa pun yang dijawab
   `supportedCommands()` menjadi `availableCommands`, dan cabang
   `commands_changed` mengirim ulang seluruh daftar dengan komentarnya sendiri
   menyebut alasannya: *"skills discovered dynamically as the agent works in a
   subdirectory"*. Caraka menyimpannya di `facts.commands`
   (`src/core/gateway.ts`) dan `/commands` mencetaknya. Tidak ada kode yang
   perlu ditulis untuk permintaan issue #14.
1. **`help.commandsEmpty` berhenti menjadi jalan buntu.** Kalimat lama berakhir
   di kata "yet" dan tidak menyebut daftar itu datang dari mana. Yang baru
   menyebut tiga hal yang menjawab issue itu tanpa perintah baru: daftarnya
   milik agent, skill ikut di dalamnya, dan ia tiba begitu sesi berjalan di
   rute ACP. `{agent}` tetap dipakai, jadi test yang menolak nama agent sebagai
   teks tetap tetap hijau.
2. **`/commands` di `/docs` berhenti menyebut Claude** dan menyebutkan skill.
   Baris itu adalah satu-satunya di situs yang menjawab pertanyaan issue #14
   secara langsung.
3. **`/guide` menyebut batasnya.** Catatan empat belas perintah sekarang
   menutup dengan perbedaan yang membuat pelapor bingung: keempat belas itu
   seluruh milik Caraka, dan yang ditawarkan agent adalah daftar lain.
4. **Daftar perintah di kedua panduan pasang** naik dari delapan ke empat belas,
   sesuai `gatewayCommands` di `src/core/channel.ts`, dan berhenti menyebut
   Claude di tiga tempat.

## Pemetaan pembuktian

| AC | Cara dibuktikan |
|---|---|
| AC-1.1, AC-1.2 | manual: kalimat `help.commandsEmpty` di `src/i18n.ts` |
| AC-1.3 | unit: *no catalog sentence names an agent as fixed text* |
| AC-1.4 | unit: pemeriksaan paritas kunci katalog |
| AC-2.1, AC-2.2 | manual: baris `/commands` di `site/src/data/docs.ts` dan catatan di `site/src/data/guide.ts` |
| AC-2.3, AC-2.4 | manual: blok perintah di kedua `docs/install-guide*.md`, dibandingkan dengan `gatewayCommands` |

## Yang berubah dari spec, dan kenapa

Spec ditulis dengan asumsi bahwa jawaban issue #14 adalah penolakan. Setelah
langkah 0, penolakannya tinggal separuh: registry skill milik Caraka tetap
ditolak, tetapi permintaan yang dibawa pelapor — melihat daftar skill dari chat
— sudah terpenuhi dan tidak ada satu kalimat pun yang mengatakannya. Yang
dikerjakan karena itu bukan penolakan melainkan empat kalimat.

## Risiko

Kalimat `help.commandsEmpty` menyebut rute ACP, dan sesi di rute CLI tidak
pernah menerima daftar apa pun. Kalimatnya karena itu ditulis sebagai syarat
("agent di rute ACP melaporkannya") dan bukan sebagai janji, supaya pemakai
codex tidak menunggu sesuatu yang tidak akan datang.

## Gate

```bash
npm run verify
```

```
> caraka@1.5.9 scan:secrets
clean: 315 tracked files, no credentials

> caraka@1.5.9 lint
All matched files use the correct format.
Finished in 919ms on 34 files using 24 threads.

> caraka@1.5.9 typecheck
> tsc -p tsconfig.json --noEmit

> caraka@1.5.9 build
> tsc -p tsconfig.json

> caraka@1.5.9 test
ℹ tests 172
ℹ pass 172
ℹ fail 0

> caraka@1.5.9 e2e
ℹ tests 108
ℹ pass 108
ℹ fail 0

> caraka-site@0.0.1 test
 Test Files  2 passed (2)
      Tests  35 passed (35)
```

Situs, dijalankan dari `site/` sesuai `CLAUDE.md`:

```
npm run check   → lint, astro check, vitest — exit 0
npm run e2e     → 142 tes lintas chromium, firefox, webkit, dan dua profil telepon
```

`site.spec.ts` yang mengukur tinggi dokumen merah lebih dulu, dan angkanya
dipakai apa adanya: `/docs` +88 ke 7607, `/guide` +47 ke 7830, `/status` −16 ke
8777. Ketiganya adalah prosa yang ditambahkan rilis ini, dan yang ketiga adalah
kartu 1.5.9 yang menggantikan kartu 1.5.4 yang lebih panjang. Sesudah angkanya
diperbarui, tes itu hijau.

Yang tidak hijau di setiap kali jalan adalah tiga tes lain, dan ketiganya diuji
sendiri-sendiri sebelum ditulis di sini:

| Tes | Kapan merah | Sendiri |
|---|---|---|
| `motion › scroll progress advances` (webkit) | dua kali, saat suite jalan 12 worker berbarengan dengan `npm run verify` | hijau |
| `no overflow › …` (mobile-safari, empat lebar) | sekali, 12 worker; tiap tes butuh ~20 dtk terhadap batas 30 dtk | hijau, 19–21 dtk |
| `header menu › the page behind it does not scroll` (mobile-chrome) | dua kali, 4 worker | hijau, `--repeat-each=3` dan bersama empat tes menu lainnya |

Ketiganya membaca keadaan sesudah penantian tetap — 600 md, 700 md, satu klik —
dan mesin yang jenuh melewati penantian itu. Berkas yang mereka uji
(`MobileMenu.astro`, `ck.js`, `mobile.spec.ts`, seluruh `styles/`) tidak
disentuh rilis ini: `git diff 1739c7c HEAD --` pada keempatnya kosong. CI
menjalankan suite yang sama di runner bersih, dan itu yang dipakai sebagai
jawaban terakhirnya.
