import { createApp } from './app.mjs';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
const app = createApp();
app.server.listen(port, '127.0.0.1', () => console.log(`ScrapLoop research workspace: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { app.close(); process.exit(0); });
