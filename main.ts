import { Hono } from '@hono/hono';
import { readAPIKey } from './src/util/secrets.ts';

const app = new Hono();

const apiKey = await readAPIKey();
console.log('API key:', apiKey);

// if API key not found, throw error and exit

// define endpoints
// Using '/' for home page, this would give some basic info
app.get('/', (c) => {
  return c.text('Hello world!');
});

// Using POST /appointments/book for booking an appointment
// Use GET /appointments/search to search for appointment slots
// Use GET /findFree to find free day of work

// Serve the endpoint
Deno.serve(app.fetch);
