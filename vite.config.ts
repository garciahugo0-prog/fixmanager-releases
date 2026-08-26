import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    base: './', // IMPORTANTE: rutas relativas para Electron
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: 'terser' as const,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log'], // Elimina llamadas a console.log para no dejar pistas de depuración
        },
        mangle: {
          toplevel: true, // Renombra variables y funciones globales en el nivel superior
        },
        format: {
          comments: false, // Elimina todos los comentarios
        },
      },
    },
    server: {
      port: 5099,
      hmr: true,
      watch: {
        ignored: [
          '**/dist/**',
          '**/release/**',
          '**/extracted_app/**',
          '**/temp_unpacked/**',
          '**/dist_test/**',
          '**/.git/**'
        ]
      }
    },
  };
});
