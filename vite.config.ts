import { defineConfig } from 'vite'

const githubPagesBase = '/kaleido-trip/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? githubPagesBase : '/',
}))
