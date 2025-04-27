import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts';

export async function readAPIKey() {
  await load({
    export: true, // Export all loaded environment variables to Deno.env
    allowEmptyValues: false, // Allow empty values in .env file
  });

  const apiKey = Deno.env.get('API_KEY');

  if (apiKey == null) {
    console.error('Cannot find a .env file. Create one and set API_KEY');
    throw new Error('Cannot find a .env file');
  }

  return apiKey;
}
