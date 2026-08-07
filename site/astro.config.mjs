// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://caraka.dev',
  // Static output. The site has no server-side behaviour and nothing to
  // personalise, so there is no adapter and nothing to keep warm.
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.endsWith('/404') })],
  trailingSlash: 'never',
  build: {
    // Each page owns its keyframes because the mockups reuse names with
    // different values. Emitting one stylesheet per page keeps those apart.
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
})
