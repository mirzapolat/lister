import { startServer } from './index.js';

startServer({
  port: 3001,
  host: '127.0.0.1',
  allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
}).catch((error) => {
  console.error('[Lister backend] Failed to start:', error);
  process.exit(1);
});
