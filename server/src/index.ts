import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './db/migrate.js';

async function main(): Promise<void> {
  // Ensure the schema exists so the dev server is self-contained.
  await migrate();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
