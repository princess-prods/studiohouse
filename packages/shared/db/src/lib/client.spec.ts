import { Pool } from 'pg';
import { createDb, createPooledDb } from './client';

const URL = 'postgresql://user:pw@ep-example.neon.tech/neondb?sslmode=require';

describe('createDb', () => {
  it('throws a helpful error without a connection string', () => {
    // Nx loads .env.local into the test process, so clear the fallback first.
    const previous = process.env['DATABASE_URL'];
    delete process.env['DATABASE_URL'];
    try {
      expect(() => createDb(undefined)).toThrow('DATABASE_URL is not set');
    } finally {
      if (previous !== undefined) process.env['DATABASE_URL'] = previous;
    }
  });

  it('builds an HTTP-driver client from an explicit connection string', () => {
    const db = createDb(URL);
    expect(typeof db.select).toBe('function');
    expect(db.query.studios).toBeDefined();
  });

  it('falls back to process.env.DATABASE_URL', () => {
    const previous = process.env['DATABASE_URL'];
    process.env['DATABASE_URL'] = URL;
    try {
      expect(typeof createDb().select).toBe('function');
    } finally {
      if (previous === undefined) delete process.env['DATABASE_URL'];
      else process.env['DATABASE_URL'] = previous;
    }
  });
});

describe('createPooledDb', () => {
  it('builds a node-postgres client over an existing pool', async () => {
    const pool = new Pool({ connectionString: URL, max: 1 });
    try {
      const db = createPooledDb(pool);
      expect(typeof db.select).toBe('function');
      expect(db.query.brands).toBeDefined();
    } finally {
      await pool.end();
    }
  });
});
