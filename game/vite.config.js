import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? 'https://scarpellino.fr/expandia' : '/',
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'src/models/*',
          dest: 'src/models',
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'game.html'),
      },
    },
  },
})
