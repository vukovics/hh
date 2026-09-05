import { Pool } from 'pg';
import { config } from '../config.js';

/**
 * Shared connection pool. A single pool per process is the pg recommendation;
 * the unique constraint in Postgres — not this pool — is what guarantees
 * correctness across multiple Node instances.
 */
export const pool = new Pool(config.database);
