import http from 'node:http';
import { createApp } from './src/app.mjs';

const port = Number(process.env.PORT || 8082);
const host = process.env.HOST || '127.0.0.1';
const app = createApp();
const server = http.createServer(app.handler);

server.listen(port, host, () => {
  console.log(`Airvana v5.3 P0/P1/P2 complete running at http://${host}:${port}`);
  console.log(`AI provider: ${app.ai.info.provider} (${app.ai.info.model})`);
});

function shutdown() {
  server.close(() => {
    app.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
