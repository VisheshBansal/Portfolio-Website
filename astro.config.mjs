import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'astro/config';
import { domain } from './src/data/site.ts';

/** KEY=value lines, as wrangler reads them; no file means no secrets. */
function readDevVars(root) {
  try {
    const lines = readFileSync(join(root, '.dev.vars'), 'utf8').split('\n');
    const pairs = lines
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => [
        line.slice(0, line.indexOf('=')).trim(),
        line
          .slice(line.indexOf('=') + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, '$2'),
      ]);
    return Object.fromEntries(pairs);
  } catch {
    return {};
  }
}

/** `astro dev` has no Worker, so /api/* runs the Worker's own code here, or the music ticket could never show Play. */
function workerApiInDev() {
  return {
    name: 'worker-api-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const { default: worker } = await server.ssrLoadModule('/worker/index.ts');
          const env = { ...readDevVars(server.config.root), ASSETS: { fetch: async () => new Response(null, { status: 404 }) } };
          const response = await worker.fetch(new Request(new URL(req.url, 'http://localhost'), { method: req.method }), env);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  site: `https://${domain}`,
  output: 'static',
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  vite: { plugins: [workerApiInDev()] },
});
