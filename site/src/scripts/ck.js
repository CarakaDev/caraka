// Caraka — the only client-side JavaScript on the site.
//
// The mockups lean on two runtime behaviours the design-comp player provided:
// a `copy` click handler, and a `--ck-sp` scroll-progress variable driving the
// top bar and the right rail. The mockups' third handler, `jump`, is gone:
// `html { scroll-behavior: smooth }` plus a plain `href="#id"` already does it,
// and `scroll-margin-top` keeps the fixed header off the target.

// --- copy buttons -----------------------------------------------------------
// Delegated, so buttons rendered anywhere on the page work without wiring.
document.addEventListener('click', async (e) => {
  const btn = e.target instanceof Element ? e.target.closest('[data-copy]') : null
  if (!btn) return

  // The label element carries its own three strings, because the two buttons
  // on the landing page word them differently: one is a terse COPY/COPIED
  // status, the other is a full call to action.
  const label = btn.querySelector('[data-copy-label]')
  const idleTone = label?.dataset.tone || '#5D666F'
  const done = (text, tone) => {
    if (!label) return
    label.textContent = text
    label.style.color = tone
    setTimeout(() => {
      label.textContent = label.dataset.copyLabel
      label.style.color = idleTone
    }, 1800)
  }

  try {
    await navigator.clipboard.writeText(btn.dataset.copy || '')
    done(label?.dataset.copied || 'COPIED', '#8EEE98') // semantic `done` green
  } catch {
    // Clipboard is blocked on insecure origins and by some privacy settings.
    // Say so rather than silently doing nothing.
    done(label?.dataset.failed || 'FAILED', '#FF93B2') // semantic `failed` magenta
  }
})

// --- scroll progress --------------------------------------------------------
// Drives --ck-sp, which the top bar scales and the right rail positions two
// dots against. Same shape as the mockups' own handler: passive listeners,
// coalesced into one write per frame. See global.css for why this is not CSS.
{
  const root = document.documentElement
  let queued = false
  const write = () => {
    queued = false
    const max = root.scrollHeight - window.innerHeight
    root.style.setProperty('--ck-sp', max > 0 ? String(Math.min(1, Math.max(0, window.scrollY / max))) : '0')
  }
  const update = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(write)
  }
  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update, { passive: true })
  write()
}
