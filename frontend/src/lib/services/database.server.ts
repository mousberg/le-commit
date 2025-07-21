// Server-only database service implementation
// This file should only be imported in API routes and server components

import { DatabaseClient } from '../supabase/database';

// Import the base class from the main database file
import { SupabaseDatabaseService } from './database';

async function createServerDatabaseClient(): Promise<DatabaseClient> {
  // Dynamic import to avoid pulling server code into client bundles
  const { createClient: createServerClient } = await import('../supabase/server');
  const client = await createServerClient();
  return new DatabaseClient(client);
}

export async function getServerDatabaseService(): Promise<SupabaseDatabaseService> {
  const dbClient = await createServerDatabaseClient();
  return new SupabaseDatabaseService(dbClient);
}