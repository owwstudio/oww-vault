import { defineConfig } from 'vite';
import pug from 'pug';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const template = fileURLToPath(new URL('./src/templates/index.pug', import.meta.url));
const dataPath = fileURLToPath(new URL('./src/data/projects.json', import.meta.url));

// Pug runs only during development/build; no template engine ships to visitors.
export default defineConfig({
  base: './',
  plugins: [{
    name: 'portfolio-pug',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const projects = JSON.parse(readFileSync(dataPath, 'utf8'));
        return pug.renderFile(template, { projects, pretty: true });
      },
    },
    configureServer(server) {
      server.watcher.add([template, dataPath]);
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.pug') || file === dataPath) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  }],
});
