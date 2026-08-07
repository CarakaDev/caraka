#!/usr/bin/env node
// Placeholder release. Caraka is pre-alpha: the specification is complete,
// the implementation is starting. See https://github.com/CarakaDev/caraka

const b = (s) => `\x1b[1m${s}\x1b[0m`;
const d = (s) => `\x1b[2m${s}\x1b[0m`;

console.log(`
  ${b("ꦕꦫꦏ  caraka")}   ${d("v0.0.0 · pre-alpha")}

  Send the task. Caraka runs it.

  ${d("Not implemented yet — this release reserves the name.")}
  ${d("The full specification is public:")}

    https://github.com/CarakaDev/caraka

  ${d("Phase 0 is a technical spike, not a release. Follow docs/roadmap.md.")}
`);
