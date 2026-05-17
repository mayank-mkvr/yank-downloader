import { NextRequest, NextResponse } from 'next/server';
import { ensurePythonEngineRunning } from '@/lib/pythonEngine';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  try {
    await ensurePythonEngineRunning();
    const response = await fetch(`${PYTHON_API_URL}/api/cookies/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch cookie status from session engine' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching cookie status:', error);
    return NextResponse.json({ error: 'Session engine is offline. Start python/app.py to enable secure cookie authentication.' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePythonEngineRunning();
    const body = await req.json();
    const { action, platform, cookieData } = body;

    if (action === 'clear') {
      const response = await fetch(`${PYTHON_API_URL}/api/cookies/clear?platform=${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to clear cookies' }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Default: upload cookies
    const response = await fetch(`${PYTHON_API_URL}/api/cookies/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, cookie_data: cookieData }),
    });

    if (!response.ok) {
      const errData = await response.json();
      return NextResponse.json({ error: errData.detail || 'Failed to upload cookies' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error handling cookie action:', error);
    return NextResponse.json({ error: 'Session engine connection failed.' }, { status: 503 });
  }
}
