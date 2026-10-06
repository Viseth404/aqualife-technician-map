// Vite build settings: React + Tailwind CSS v4 plugin.
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/..." means "src/..." (used by shadcn/ui components).
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  // Maps + drawing + geometry libraries make one big file; that's OK for an admin tool.
  build: { chunkSizeWarningLimit: 1500 },
});
