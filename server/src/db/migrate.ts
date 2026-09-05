import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

/**
 * Applies schema.sql. Idempotent (CREATE TABLE IF NOT EXISTS), so safe to run
 * repeatedly and from tests. Not a substitute for a real migration tool in
 * production — see HARDENING.md.
 */
export async function migrate(): Promise<void> {
  const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
}

// Run directly via `npm run migrate`.
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log('Migration complete.');
      return pool.end();
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
