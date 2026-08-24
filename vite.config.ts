import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import apiDevPlugin from './vite-plugin-api-dev.js';
import siteConfigPlugin from './vite-plugin-site-config.js';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  Object.assign(process.env, env);
  return {
    // siteConfigPlugin preenche os marcadores {{...}} do HTML a partir de
    // siteConfig.js, tanto no `dev` quanto no `build`.
    // apiDevPlugin serve as funcoes de api/ no `dev`; em producao quem as
    // serve e a propria Vercel.
    plugins: [siteConfigPlugin(), apiDevPlugin(), react(), tailwindcss()],
    // Nao existe `define` para a chave da IA de proposito: `define` faz a
    // substituicao TEXTUAL no bundle do cliente, e a chave iria parar no
    // JavaScript baixado por qualquer visitante. Quem fala com o provedor e
    // a funcao serverless em api/, que le process.env no servidor.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          // Precisa entrar aqui por dois motivos: sem estar nos inputs o arquivo
          // nao chega ao dist/, e os marcadores {{...}} nao sao substituidos —
          // a pagina de erro sairia com "{{loja.nomeCompleto}}" cru na tela.
          // Na Vercel, um 404.html na raiz da saida vira a pagina de erro padrao.
          erro404: path.resolve(__dirname, '404.html'),
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
          privacidade: path.resolve(__dirname, 'privacidade.html'),
          sisoriente: path.resolve(__dirname, 'sisoriente.html'),
          fraternidadezap: path.resolve(__dirname, 'fraternidadezap.html'),
          balaustre: path.resolve(__dirname, 'balaustre.html'),
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
