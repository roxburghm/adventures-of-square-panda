import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // './' means the built game works from any folder on any web host (GitHub Pages, Netlify, itch.io...).
  base: './',
  build: {
    chunkSizeWarningLimit: 2000, // Phaser is big; that's fine
    rollupOptions: {
      input: {
        game: fileURLToPath(new URL('./index.html', import.meta.url)),
        editor: fileURLToPath(new URL('./editor.html', import.meta.url)),
      },
    },
  },
});
