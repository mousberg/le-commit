import { NextRequest, NextResponse } from 'next/server';

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

interface AirtableFields {
  Email: string;
  'Full Name'?: string;
  'Company Name'?: string;
  'Company Size'?: string;
  Industry?: string[];
  'Sign Up Date': string;
  Status: string;
  Notes: string;
}

async function getFromAirtable(email: string): Promise<WaitlistEntry | null> {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableName = process.env.AIRTABLE_TABLE_NAME || 'Waitlist';

  if (!airtableApiKey || !airtableBaseId) {
    console.warn('Airtable credentials not configured');
    return null;
  }

  try {
    const filterFormula = `{Email} = "${email}"`;
    const response = await fetch(
      `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?filterByFormula=${encodeURIComponent(filterFormula)}`,
      {
        headers: {
          'Authorization': `Bearer ${airtableApiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Airtable API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      return {
        id: record.id,
        email: record.fields.Email,
        name: record.fields['Full Name'] || '',
        company: record.fields['Company Name'] || '',
        employees: record.fields['Company Size'] || '',
        industry: Array.isArray(record.fields.Industry) ? record.fields.Industry[0] : (record.fields.Industry || ''),
        timestamp: record.fields['Sign Up Date'] || new Date().toISOString(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting from Airtable:', error);
    return null;
  }
}

async function updateAirtableRecord(recordId: string, entry: WaitlistEntry): Promise<boolean> {
  const airtableApiKey = process.env.AIRTABLE_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtableTableName = process.env.AIRTABLE_TABLE_NAME || 'Waitlist';

  if (!airtableApiKey || !airtableBaseId) {
    return false;
  }

  try {
    const fields: Partial<AirtableFields> = {
      Email: entry.email,
      'Sign Up Date': new Date().toISOString().split('T')[0],
      Status: 'Waiting',
      Notes: `IP: ${entry.ip || 'unknown'}, UserAgent: ${entry.userAgent || 'unknown'}`
    };

    // Only add non-empty fields
    if (entry.name && entry.name.trim()) fields['Full Name'] = entry.name;
    if (entry.company && entry.company.trim()) fields['Company Name'] = entry.company;
    if (entry.employees && entry.employees.trim()) fields['Company Size'] = entry.employees;
    if (entry.industry && entry.industry.trim()) fields.Industry = [entry.industry];

    const response = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        fields,
        typecast: true 
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error updating Airtable record:', error);
    return false;
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
    const fields: Partial<AirtableFields> = {
      Email: entry.email,
      'Sign Up Date': new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
      Status: 'Waiting',
      Notes: `IP: ${entry.ip || 'unknown'}, UserAgent: ${entry.userAgent || 'unknown'}`
    };

    // Only add non-empty fields
    if (entry.name && entry.name.trim()) fields['Full Name'] = entry.name;
    if (entry.company && entry.company.trim()) fields['Company Name'] = entry.company;
    if (entry.employees && entry.employees.trim()) fields['Company Size'] = entry.employees;
    if (entry.industry && entry.industry.trim()) fields.Industry = [entry.industry];

    const response = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{ fields }],
        typecast: true
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

    if (id) {
      // Update existing entry by ID (complete form submission)
      const updatedEntry: WaitlistEntry = {
        id,
        email: email.toLowerCase(),
        name: name || '',
        company: company || '',
        employees: employees || '',
        industry: industry || '',
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      };

      const success = await updateAirtableRecord(id, updatedEntry);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update record' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Successfully updated waitlist entry', id: updatedEntry.id },
        { status: 200 }
      );
    } else {
      // Create new entry or check if exists
      const existingEntry = await getFromAirtable(email.toLowerCase());
      
      if (existingEntry) {
        // Email already exists, return the existing ID
        return NextResponse.json(
          { message: 'Email already registered', id: existingEntry.id },
          { status: 200 }
        );
      }

      // Create new entry
      const entryData: WaitlistEntry = {
        email: email.toLowerCase(),
        name: name || '',
        company: company || '',
        employees: employees || '',
        industry: industry || '',
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      };

      const airtableId = await addToAirtable(entryData);
      
      if (!airtableId) {
        return NextResponse.json(
          { error: 'Failed to add to waitlist' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Successfully added to waitlist', id: airtableId },
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

export async function GET() {
  try {
    // This endpoint could be used for admin purposes
    // You might want to add authentication here
    
    // For now, return a simple response since we're using Airtable directly
    // You could implement Airtable listing here if needed
    return NextResponse.json({
      message: 'Waitlist endpoint is active',
      note: 'Data is stored in Airtable'
    });
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}