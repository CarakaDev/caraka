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

// --- disclosure menus -------------------------------------------------------
// <details> gives open/close, focus, and the expanded/collapsed announcement
// for free. Two things it does not give, and both matter on a phone:
// Escape does not close it, and the page behind it keeps scrolling.
{
  const menu = () => document.querySelector('.ck-menu[open]')

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    const open = menu()
    if (!open) return
    open.removeAttribute('open')
    open.querySelector('summary')?.focus()
  })

  // A tap outside the panel should dismiss it, the same as any menu.
  document.addEventListener('click', (e) => {
    const open = menu()
    if (open && e.target instanceof Node && !open.contains(e.target)) open.removeAttribute('open')
  })

  // Scroll lock. Two things had to be measured rather than assumed:
  // the root element is the scroller, so locking the body alone computes to
  // overflow:hidden and changes nothing; and iOS Safari ignores overflow:hidden
  // on the root anyway. Pinning the body and carrying the offset is the only
  // approach that holds on both, and it is why the scroll position has to be
  // restored by hand afterwards.
  let lockedAt = 0
  const setLock = (on) => {
    const root = document.documentElement
    const body = document.body
    if (on) {
      lockedAt = window.scrollY
      root.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${lockedAt}px`
      body.style.left = '0'
      body.style.right = '0'
    } else {
      root.style.overflow = ''
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      window.scrollTo(0, lockedAt)
    }
  }

  document.addEventListener(
    'toggle',
    (e) => {
      if (!(e.target instanceof Element) || !e.target.classList.contains('ck-menu')) return
      setLock(e.target.hasAttribute('open'))
    },
    true, // toggle does not bubble
  )
}

// --- scrollable regions -----------------------------------------------------
// A region you can only reach by dragging is unreachable by keyboard. Chromium
// and Firefox make an overflowing container focusable on their own; WebKit does
// not, so on Safari the right-hand half of a colour ramp or a simulation strip
// cannot be reached at all. Confirmed by tabbing 80 times on /brand/warna:
// reached in Chromium and Firefox, never in WebKit.
//
// Found by measurement, not by class name, and applied only while the element
// actually overflows — on a container that fits, a tab stop leads nowhere.
// `tabindex` alone is the fix; `role="region"` without an accessible name
// announces worse than no role at all.
{
  const candidates = () => document.querySelectorAll('[class*="ck-m-"], [data-scroll-region]')
  const sync = () => {
    for (const el of candidates()) {
      const ox = getComputedStyle(el).overflowX
      const scrollable = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1
      if (scrollable) el.setAttribute('tabindex', '0')
      else el.removeAttribute('tabindex')
    }
  }
  sync()
  addEventListener('resize', sync, { passive: true })
}
