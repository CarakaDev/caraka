# ERD — Model Data

**Produk:** Caraka · **Versi:** 0.2 · **Tanggal:** 7 Agustus 2026
**Basis data:** SQLite tunggal di `~/.caraka/caraka.db` (WAL mode) + ekstensi `sqlite-vec` untuk vektor dan FTS5 untuk pencarian leksikal.

---

## 1. Diagram relasi

```
  principal ──1──┬──∞── identity            (satu orang, banyak akun channel)
                 │
                 ├──∞── policy_grant ──∞──1── workspace
                 │
                 └──∞── session ──∞──1── workspace
                             │
                             ├──∞── run ──∞── approval
                             │        └──∞── artifact
                             └──∞── message

  workspace ──1──∞── memory ──1──1── memory_vec   (virtual, sqlite-vec)
                       └────────────── memory_fts (virtual, FTS5)

  agent_preset ──1──∞── session
  audit_event   (standalone, append-only)
  pairing_request (fana, TTL)
```

---

## 2. Tabel

### `principal` — manusia
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | ULID |
| `display_name` | TEXT | |
| `created_at` | INTEGER | epoch ms |
| `is_owner` | INTEGER | 1 = operator utama |
| `default_locale` | TEXT | `id` \| `en` |

### `identity` — akun channel milik principal
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `principal_id` | TEXT FK → principal | |
| `channel` | TEXT | `telegram`\|`whatsapp`\|`discord`\|`signal` |
| `external_id` | TEXT | user id / nomor telepon |
| `handle` | TEXT | @username, opsional |
| `verified_at` | INTEGER | waktu pairing disetujui |
| `revoked_at` | INTEGER NULL | |

**UNIQUE(`channel`, `external_id`)** — satu akun channel hanya milik satu principal.

### `workspace` — repo/direktori kerja
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `slug` | TEXT UNIQUE | dipakai sebagai `@slug` |
| `path` | TEXT | absolut |
| `default_agent` | TEXT FK → agent_preset.id | |
| `default_mode` | TEXT | `read-only`\|`assisted` |
| `notes_path` | TEXT | default `<path>/NOTES.md` |
| `created_at` | INTEGER | |
| `archived_at` | INTEGER NULL | |

### `agent_preset` — definisi driver per agent
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | `claude-code`, `codex`, … |
| `driver` | TEXT | `acp`\|`cli`\|`mcp` |
| `command` | TEXT | |
| `config_json` | TEXT | seluruh field driver (args, sessionMode, dll) |
| `detected_version` | TEXT NULL | |
| `last_health_at` | INTEGER NULL | |
| `healthy` | INTEGER | |

### `policy_grant` — izin per principal per workspace
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `principal_id` | TEXT FK | |
| `workspace_id` | TEXT FK | |
| `mode` | TEXT | `read-only`\|`assisted`\|`trusted` |
| `granted_by` | TEXT | `config`\|`cli` (**tidak pernah** `chat`) |
| `expires_at` | INTEGER NULL | wajib terisi untuk `trusted` |
| `created_at` | INTEGER | |

**UNIQUE(`principal_id`, `workspace_id`)**

### `session` — percakapan berkelanjutan (= satu "tab")
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | dipakai sebagai `#a91` (8 char pertama) |
| `principal_id` | TEXT FK | |
| `workspace_id` | TEXT FK | |
| `agent_id` | TEXT FK → agent_preset | |
| `container_id` | TEXT FK → container | chat/guild tempat sesi hidup |
| `thread_ref` | TEXT NULL | `message_thread_id` Telegram / thread id Discord |
| `thread_state` | TEXT | `open`\|`closed`\|`deleted`\|`none` |
| `title` | TEXT | judul yang tampil di daftar topic |
| `icon_state` | TEXT NULL | state terakhir yang **sudah** ditulis ke ikon — mencegah `editForumTopic` berulang |
| `pinned` | INTEGER | dikecualikan dari auto-hapus |
| `close_after` | INTEGER NULL | jadwal penghapusan topic |
| `agent_session_id` | TEXT NULL | id sesi milik agent (ACP sessionId / CLI thread_id) |
| `memory_context_id` | TEXT NULL | id `context` Titen terakhir — dipakai untuk `feedback` |
| `state` | TEXT | `idle`\|`running`\|`awaiting_approval`\|`queued`\|`done`\|`failed`\|`cancelled` |
| `created_at` / `last_active_at` | INTEGER | |
| `closed_at` | INTEGER NULL | |

Index: `(container_id, thread_ref)` UNIQUE · `(workspace_id, state)` · `(state, close_after)`.

### `container` — wadah tempat sesi hidup
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `channel` | TEXT | `telegram`\|`discord`\|`whatsapp`\|`signal` |
| `chat_id` | TEXT | chat / guild channel |
| `kind` | TEXT | `dm`\|`forum`\|`guild_channel` |
| `supports_threads` | INTEGER | hasil `detect()` — `createForumTopic` **gagal diam-diam** bila forum mode mati |
| `general_thread_ref` | TEXT NULL | topic "General" / channel induk |
| `detected_at` | INTEGER | disegarkan oleh `doctor` |

**UNIQUE(`channel`, `chat_id`)**

> Aturan: sesi tidak pernah berpindah topic, dan topic tidak pernah dipakai ulang oleh sesi lain — ditegakkan oleh unique index `(container_id, thread_ref)`.

### `message` — jejak percakapan
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `session_id` | TEXT FK | |
| `direction` | TEXT | `in`\|`out` |
| `role` | TEXT | `user`\|`agent`\|`system` |
| `text` | TEXT | **sudah diredaksi** |
| `attachments_json` | TEXT | |
| `channel_msg_ref` | TEXT NULL | untuk edit-in-place |
| `ts` | INTEGER | |

### `run` — satu eksekusi tugas
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `session_id` | TEXT FK | |
| `prompt_message_id` | TEXT FK → message | |
| `state` | TEXT | `queued`\|`running`\|`done`\|`error`\|`cancelled`\|`interrupted` |
| `started_at` / `ended_at` | INTEGER | |
| `stop_reason` | TEXT NULL | |
| `tokens_in` / `tokens_out` | INTEGER NULL | bila dilaporkan agent |
| `error` | TEXT NULL | |

### `approval` — permintaan izin
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `run_id` | TEXT FK | |
| `action` | TEXT | `write`\|`exec`\|`network`\|`delete`\|`git` |
| `target` | TEXT | path / command |
| `summary` | TEXT | |
| `risk` | TEXT | `low`\|`high` |
| `nonce` | TEXT UNIQUE | sekali pakai, terikat `(principal, session, request)` |
| `hmac` | TEXT | tanda tangan payload callback (`callback_data` maks 64 byte → hanya id yang dikirim) |
| `ephemeral_msg_id` | TEXT NULL | bila kartu dikirim ephemeral di grup |
| `short_code` | TEXT | mis. `A7F3`, untuk channel tanpa tombol |
| `expires_at` | INTEGER | |
| `decision` | TEXT NULL | `allow`\|`deny`\|`expired` |
| `decided_by` | TEXT NULL | FK → principal |
| `decided_at` | INTEGER NULL | |

### `artifact` — hasil yang bisa dikirim
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `run_id` | TEXT FK | |
| `kind` | TEXT | `diff`\|`file`\|`log`\|`image` |
| `path` | TEXT | |
| `meta_json` | TEXT | `{added, removed, lang}` |
| `sent_at` | INTEGER NULL | |

### `memory_ref` — penunjuk ke Titen (bukan penyimpan memori)

> **Perubahan penting v0.2.** Memori tidak lagi disimpan di skema kita. Titen memiliki *observation*, *claim*, dan *context* beserta content hash, `supersede`, `expire`, dan provenance-nya. Kita hanya menyimpan **penunjuk** agar dapat menampilkan dan menelusurinya.

| Kolom | Tipe | Ket |
|---|---|---|
| `id` | TEXT PK | |
| `scope_kind` | TEXT | `workspace`\|`user` |
| `scope_id` | TEXT | |
| `titen_kind` | TEXT | `observation`\|`claim`\|`context` |
| `titen_id` | TEXT | mis. `claim_f3963d7b…` |
| `label` | TEXT NULL | ringkasan pendek untuk ditampilkan di `/memori` |
| `pinned` | INTEGER | |
| `created_at` | INTEGER | |

Bila provider `none` atau `local` dipakai, tabel ini kosong atau menunjuk ke tabel lokal sederhana (`memory_local`: `id, scope, text, created_at` + FTS5). Tidak ada vektor, tidak ada claim graph — fallback memang sengaja dangkal.

### `audit_event` — append-only
| Kolom | Tipe | Ket |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `ts` | INTEGER | |
| `channel` / `principal_id` / `session_id` / `workspace_id` / `agent_id` | TEXT NULL | |
| `action` | TEXT | `msg.in`, `run.start`, `approval.decide`, `policy.change`, … |
| `tool` | TEXT NULL | |
| `args_hash` | TEXT NULL | SHA-256 argumen (bukan argumennya) |
| `result` | TEXT | `ok`\|`denied`\|`error` |
| `duration_ms` | INTEGER NULL | |
| `detail_json` | TEXT NULL | **sudah diredaksi** |

Tanpa UPDATE/DELETE dari kode aplikasi; pembersihan hanya lewat job retensi.

### `pairing_request` — fana
| Kolom | Tipe | Ket |
|---|---|---|
| `code` | TEXT PK | 6 karakter |
| `channel` / `external_id` / `handle` | TEXT | |
| `created_at` / `expires_at` | INTEGER | TTL 15 menit |

---

## 3. Aturan integritas

1. Sebuah `session` **wajib** punya `policy_grant` aktif untuk `(principal, workspace)`; kalau tidak → tolak.
2. `policy_grant.mode = 'trusted'` **wajib** punya `expires_at`. Constraint di level DB.
3. `approval.nonce` unik global dan hanya bisa dipakai sekali (`decision` sekali tulis).
4. Maksimal satu `run` berstatus `running` per `workspace_id` — dijaga oleh unique partial index.
4b. Maksimal satu `session` per `(container_id, thread_ref)` — topic tidak pernah dipakai ulang.
4c. Maksimal **5** `session` aktif (`running`/`awaiting_approval`/`queued`) per principal — ditegakkan `topics.sweep()`, bukan constraint DB.
5. `message.text` dan `audit_event.detail_json` disimpan **setelah** redaksi rahasia. Tidak ada data mentah rahasia yang pernah masuk disk.
6. Menghapus `workspace` melakukan cascade ke session/run/memory; `audit_event` **tidak** ikut terhapus (jejak harus bertahan).

---

## 4. Retensi

| Data | Default | Dapat diatur |
|---|---|---|
| `message` | 90 hari | ya |
| `run` + `artifact` | 30 hari (file artefak 7 hari) | ya |
| `audit_event` | 30 hari | ya |
| `memory` | tanpa batas, kecuali `expires_at` | ya |
| `pairing_request` | 15 menit | tidak |

---

## 5. Migrasi

Migrasi bernomor maju-saja (`store/migrations/0001_init.sql`, …), dijalankan otomatis saat start, dengan backup `caraka.db` sebelum migrasi mayor. Versi skema disimpan di `PRAGMA user_version`.
