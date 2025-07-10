import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface WaitlistEntry {
  id?: string;
  email: string;
  name?: string;
  company?: string;
  employees?: string;
  industry?: string;
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

async function addToAirtable(entry: WaitlistEntry): Promise<string | null> {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableName = process.env.AIRTABLE_TABLE_NAME || 'Waitlist';

  if (!airtableApiKey || !airtableBaseId) {
    console.warn('Airtable credentials not configured, skipping Airtable integration');
    return null;
  }

  try {
    const fields = {
      Email: entry.email,
      'Full Name': entry.name || '',
      'Company Name': entry.company || '',
      'Company Size': entry.employees || '',
      Industry: entry.industry ? [entry.industry] : [], // Multiple select field
      'Sign Up Date': new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
      Status: 'Waiting',
      Notes: `IP: ${entry.ip || 'unknown'}, UserAgent: ${entry.userAgent || 'unknown'}`
    };

    const response = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{ fields }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.records[0]?.id || null;
  } catch (error) {
    console.error('Error adding to Airtable:', error);
    return null;
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, company, employees, industry, id } = body;

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

    if (id) {
      // Update existing entry by ID (complete form submission)
      const existingEntryIndex = waitlist.findIndex(entry => entry.id === id);
      
      if (existingEntryIndex === -1) {
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404 }
        );
      }

      const updatedEntry: WaitlistEntry = {
        ...waitlist[existingEntryIndex],
        name: name || '',
        company: company || '',
        employees: employees || '',
        industry: industry || '',
        timestamp: new Date().toISOString(),
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      };

      waitlist[existingEntryIndex] = updatedEntry;
      await writeWaitlist(waitlist);

      // Only call Airtable when complete form is submitted
      await addToAirtable(updatedEntry);

      return NextResponse.json(
        { message: 'Successfully updated waitlist entry', id: updatedEntry.id },
        { status: 200 }
      );
    } else {
      // Create new entry (just email)
      const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const entryData: WaitlistEntry = {
        id: newId,
        email: email.toLowerCase(),
        name: name || '',
        company: company || '',
        employees: employees || '',
        industry: industry || '',
        timestamp: new Date().toISOString(),
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      };

      waitlist.push(entryData);
      await writeWaitlist(waitlist);

      // No Airtable call here - only on complete form submission

      return NextResponse.json(
        { message: 'Successfully added to waitlist', id: entryData.id },
        { status: 201 }
      );
    }

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