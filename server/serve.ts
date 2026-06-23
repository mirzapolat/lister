import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { startServer } from './index.js';

// Production entry: serve the built frontend bundle and the SMTP relay from a
// single Node process, bound to all interfaces so the container is reachable
// behind Traefik. (Dev uses server/run.ts, which binds to localhost only.)
const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const staticPath = join(__dirname, '..', 'dist');

startServer({
  port,
  host: '0.0.0.0',
  staticPath,
}).catch((error) => {
  console.error('[Lister backend] Failed to start:', error);
  process.exit(1);
});
