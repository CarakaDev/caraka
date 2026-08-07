# Changelog

All notable changes to this project are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The database schema carries its own version in `PRAGMA user_version` and moves independently.

## [Unreleased]

Phase 0 of the roadmap: a technical spike to confirm three assumptions before the product is written.

### To confirm
- ACP permission requests actually fire for write operations on Claude Code
- `createForumTopic` works in a private chat with no admin rights
- `sendRichMessage` and `sendRichMessageDraft` behave as documented, and no `editRichMessage` exists
- Titen `bootstrap` and `serve`, with compile latency measured

## [0.0.0] — 2026-08-07

Name reservation on npm. Nothing is implemented.

### Added
- Full public specification: PRD, FRD, BRD, design, ERD, security model, roadmap
- Eleven sourced research documents
- Brand: name, hanacaraka philosophy, logo book, colour system built with a differential method
- `bin/caraka.mjs` prints status and a link to the repository

### Decided
- Telegram is the first and only channel in v1.0. Long-polling means no port is ever exposed
- Claude Code is the first agent, over ACP
- Titen is the default memory provider, deterministic and running locally
- Kesumba `#E2452C` is the brand colour. It is the only candidate tested that clears 3:1 against both light and dark browser chrome
- No plugin marketplace, ever. Extension happens through a YAML preset or an MCP server the user installs deliberately

[Unreleased]: https://github.com/CarakaDev/caraka/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/CarakaDev/caraka/releases/tag/v0.0.0
