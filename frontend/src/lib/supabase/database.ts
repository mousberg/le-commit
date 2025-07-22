import { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from './client';
// Remove static import of server client to prevent client-side bundling issues

// Database table names
export const TABLES = {
  USERS: 'users',
  WORKSPACES: 'workspaces',
  WORKSPACE_MEMBERS: 'workspace_members',
  APPLICANTS: 'applicants',
  FILES: 'files',
} as const;

// Storage bucket names
export const STORAGE_BUCKETS = {
  CV_FILES: 'cv-files',
  LINKEDIN_FILES: 'linkedin-files',
  OTHER_FILES: 'other-files',
} as const;

// Database client factory
export class DatabaseClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // Static factory methods
  static createBrowserClient(): DatabaseClient {
    return new DatabaseClient(createBrowserClient());
  }


  // Get the underlying Supabase client
  getClient(): SupabaseClient {
    return this.client;
  }

  // Helper method to get current user
  async getCurrentUser() {
    const { data: { user }, error } = await this.client.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Helper method to get current session
  async getCurrentSession() {
    const { data: { session }, error } = await this.client.auth.getSession();
    if (error) throw error;
    return session;
  }

  // Transaction helper
  async withTransaction<T>(callback: (client: SupabaseClient) => Promise<T>): Promise<T> {
    // Note: Supabase doesn't have explicit transaction support in the client
    // This is a placeholder for future transaction implementation
    return await callback(this.client);
  }

  // Query builder helpers
  from(table: string) {
    return this.client.from(table);
  }

  storage() {
    return this.client.storage;
  }

  auth() {
    return this.client.auth;
  }

  // Realtime helpers
  channel(name: string) {
    return this.client.channel(name);
  }

  // RPC helper for stored procedures
  rpc(functionName: string, params?: Record<string, unknown>) {
    return this.client.rpc(functionName, params);
  }
}

// Singleton instances for common usage patterns
let browserClientInstance: DatabaseClient | null = null;

export function getBrowserDatabaseClient(): DatabaseClient {
  if (!browserClientInstance) {
    browserClientInstance = DatabaseClient.createBrowserClient();
  }
  return browserClientInstance;
}

