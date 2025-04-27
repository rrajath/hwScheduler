import { getICalData } from '../util/ical.util.ts';

export interface AgentWorkHours {
  schedule: {
    [day: string]: {
      startTime: string;
      endTime: string;
    };
  };
}

export let inMemoryDatabase: Deno.Kv;

export async function dbInit() {
  inMemoryDatabase = await Deno.openKv();
  await bootstrapDatabase();
  await bootstrapAgentDatabase();
  console.log('Database initialized');
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

/**
 * This function is used to bootstrap the agent work hours database
 * It sets the work hours for a specific agent on specific days
 * and stores it in the in-memory database
 *
 * The assumption here is that this data will typically be stored in a database
 * and not hardcoded. This is just for demonstration purposes.
 */
export async function bootstrapAgentDatabase() {
  const agentWorkHours: AgentWorkHours = {
    schedule: {
      Wednesday: { startTime: '10:00', endTime: '18:00' },
      Thursday: { startTime: '10:00', endTime: '18:00' },
      Friday: { startTime: '10:00', endTime: '18:00' },
      Saturday: { startTime: '10:00', endTime: '18:00' },
      Sunday: { startTime: '10:00', endTime: '18:00' },
    },
  };

  const agentId = '1';
  const clientId = '1';
  const key = [`agentWorkSchedule`, `${clientId}#${agentId}`];

  await inMemoryDatabase.set(key, agentWorkHours);
}
