// import { DB } from 'sqlite';
// import { parseICalData } from '../util/ical.util.ts';

import { getICalData } from '../util/ical.util.ts';

/*
export function dbInit() {
  console.log('Initializing database...');

  const db = new DB('house_whisper.db');

  db.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
    )
    `);

  db.close();
}
*/

export let inMemoryDatabase: Deno.Kv;

export async function dbInit() {
  inMemoryDatabase = await Deno.openKv();
  await bootstrapDatabase();
  return inMemoryDatabase;
}

export const inMemoryDb = await dbInit();

export async function getDatabase() {
  if (inMemoryDatabase == null) {
    await dbInit();
  }
  return inMemoryDatabase;
}

export async function bootstrapDatabase() {
  // read calendar
  const calendar = await getICalData();
  // write values from calendar to KV store
  inMemoryDatabase.set(['calendar', '1#1'], calendar);
}
