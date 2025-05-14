import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's Google Sheet URL from the backend
    const configResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/config?email=${session.user.email}`);
    if (!configResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
    }
    const config = await configResponse.json();

    if (!config.google_sheet_url) {
      return NextResponse.json({ error: 'Google Sheet URL not configured' }, { status: 400 });
    }

    // Call the backend to download and process the contacts
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/download-contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: session.user.email,
        sheet_url: config.google_sheet_url,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Failed to download contacts' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Contacts downloaded successfully' });
  } catch (error) {
    console.error('Download contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 