import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: 'https://giovanniscarpellino.github.io/expandia',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'game.html'),
      },
    },
  },
})
