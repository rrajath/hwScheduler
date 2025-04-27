import { Hono } from '@hono/hono';
import { appointmentController } from './src/controllers/appointment.controller.ts';
import { bootstrapDatabase, dbInit } from './src/config/db.config.ts';
import { availabilityController } from './src/controllers/availability.controller.ts';

const app = new Hono();
await dbInit();
await bootstrapDatabase();

// const apiKey = await readAPIKey();
// console.log('API key:', apiKey);

// if API key not found, throw error and exit

// define endpoints
app.route('/api/appointments', appointmentController);
app.route('/api/availability', availabilityController);

// Using POST /appointments/book for booking an appointment
// Use GET /appointments/search to search for appointment slots
// Use GET /findFree to find free day of work

// Serve the endpoint
Deno.serve(app.fetch);
