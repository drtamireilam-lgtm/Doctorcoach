import { defineConfig } from 'vite';
export default defineConfig({ build: { outDir: 'dist-anatomy', rollupOptions: { input: 'anatomy-lab.html' } } });
