import { defineConfig } from 'astro/config';
import site from './src/data/site.json' with { type: 'json' };

export default defineConfig({
  site: site.url,
  output: 'static',
  devToolbar: {
    enabled: false,
  },
});
