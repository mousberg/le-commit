// Server-only database service implementation
// This file should only be imported in API routes and server components

import { DatabaseClient } from '../supabase/database';
import { SupabaseDatabaseService } from './database';

class ServerSupabaseDatabaseService extends SupabaseDatabaseService {
  constructor(dbClient: DatabaseClient) {
    super();
    // Override the browser client with server client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).dbClient = dbClient;
  }
}

async function createServerDatabaseClient(): Promise<DatabaseClient> {
  // Dynamic import to avoid pulling server code into client bundles
  const { createClient: createServerClient } = await import('../supabase/server');
  const client = await createServerClient();
  return new DatabaseClient(client);
}

export async function getServerDatabaseService(): Promise<SupabaseDatabaseService> {
  const dbClient = await createServerDatabaseClient();
  return new ServerSupabaseDatabaseService(dbClient);
}