import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { env } from './env';
// Raw Neon client — for raw SQL when needed (EXPLAIN ANALYZE, health checks, etc.)
const sql = neon(env.DATABASE_URL);

// Drizzle ORM — for type-safe queries (this is what you'll use 95% of the time)
// Passing { schema } gives you db.query.users, db.query.images, etc.
export const db = drizzle({ client: sql, schema });