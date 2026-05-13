import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          login: path.resolve(__dirname, 'login.html'),
          dashboard: path.resolve(__dirname, 'dashboard.html'),
          biblioteca: path.resolve(__dirname, 'biblioteca.html'),
          cadastro: path.resolve(__dirname, 'cadastro.html'),
          calendario: path.resolve(__dirname, 'calendario.html'),
          fraternidade: path.resolve(__dirname, 'fraternidade.html'),
          tesouraria: path.resolve(__dirname, 'tesouraria.html'),
          timbre: path.resolve(__dirname, 'timbre.html'),
          historia: path.resolve(__dirname, 'historia.html'),
          patrono: path.resolve(__dirname, 'patrono.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
