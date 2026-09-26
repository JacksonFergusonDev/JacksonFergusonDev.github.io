import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jacksonferguson.me',
  output: 'static',
  trailingSlash: 'always',
  markdown: { shikiConfig: { theme: 'github-dark-default' } },
  devToolbar: { enabled: false },
});
