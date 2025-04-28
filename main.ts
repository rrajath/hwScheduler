import { Hono } from '@hono/hono';
import { appointmentController } from './src/controllers/appointment.controller.ts';
import { bootstrapDatabase, dbInit } from './src/config/db.config.ts';
import { availabilityController } from './src/controllers/availability.controller.ts';

const app = new Hono();
await dbInit();
await bootstrapDatabase();

// define endpoints
app.get('/', (c) => {
  return c.text('Welcome to House Whisper');
});
app.route('/api/appointments', appointmentController);
app.route('/api/availability', availabilityController);

// Serve the endpoint
Deno.serve(app.fetch);
