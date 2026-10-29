import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jacksonferguson.me',
  output: 'static',
  server: ({ command }) => ({
    host: '127.0.0.1',
    port: command === 'dev' ? 4300 : 4301,
  }),
  vite: {
    server: { strictPort: true },
    preview: { strictPort: true },
  },
  trailingSlash: 'always',
  markdown: { shikiConfig: { theme: 'github-dark-default' } },
  devToolbar: { enabled: false },
});
