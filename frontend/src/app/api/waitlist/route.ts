import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface WaitlistEntry {
  email: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

const WAITLIST_FILE = path.join(process.cwd(), 'data', 'waitlist.json');

async function ensureDataDirectory() {
  const dataDir = path.dirname(WAITLIST_FILE);
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
}

async function readWaitlist(): Promise<WaitlistEntry[]> {
  try {
    await ensureDataDirectory();
    if (!existsSync(WAITLIST_FILE)) {
      return [];
    }
    const data = await readFile(WAITLIST_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading waitlist:', error);
    return [];
  }
}

async function writeWaitlist(entries: WaitlistEntry[]): Promise<void> {
  try {
    await ensureDataDirectory();
    await writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2));
  } catch (error) {
    console.error('Error writing waitlist:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Read existing waitlist
    const waitlist = await readWaitlist();

    // Check if email already exists
    const existingEntry = waitlist.find(entry => 
      entry.email.toLowerCase() === email.toLowerCase()
    );

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Add new entry
    const newEntry: WaitlistEntry = {
      email: email.toLowerCase(),
      timestamp: new Date().toISOString(),
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    waitlist.push(newEntry);
    await writeWaitlist(waitlist);

    return NextResponse.json(
      { message: 'Successfully added to waitlist' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error processing waitlist signup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // This endpoint could be used for admin purposes
    // You might want to add authentication here
    const waitlist = await readWaitlist();
    
    return NextResponse.json({
      count: waitlist.length,
      entries: waitlist.map(entry => ({
        email: entry.email,
        timestamp: entry.timestamp
      }))
    });
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}