import { NextRequest, NextResponse } from 'next/server';
import { ensurePythonEngineRunning } from '@/lib/pythonEngine';
import { 
  getCookiesForPlatform, 
  saveCookiesForPlatform, 
  clearCookiesForPlatform, 
  parseCookieString 
} from '@/lib/cookieManager';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  try {
    // 1. Try Python backend first
    await ensurePythonEngineRunning();
    const response = await fetch(`${PYTHON_API_URL}/api/cookies/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.warn('Python Session Engine is offline. Falling back to native TypeScript Cookie Manager:', error.message);
  }

  // 2. Fallback: Native Node.js Cookie Manager
  try {
    const platforms = ['youtube', 'instagram', 'facebook', 'onedrive', 'telegram'];
    const status: Record<string, any> = {};
    
    for (const plat of platforms) {
      const cookies = getCookiesForPlatform(plat);
      status[plat] = {
        configured: cookies.length > 0,
        count: cookies.length,
        valid: cookies.length > 0
      };
    }
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('Failed to query native cookie status:', err);
    return NextResponse.json({ error: 'Failed to retrieve session cookie states.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { action, platform, cookieData } = body;
  if (!platform) {
    return NextResponse.json({ error: 'Platform identifier is required' }, { status: 400 });
  }

  // 1. Try Python backend first
  try {
    await ensurePythonEngineRunning();
    if (action === 'clear') {
      const response = await fetch(`${PYTHON_API_URL}/api/cookies/clear?platform=${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } else {
      const response = await fetch(`${PYTHON_API_URL}/api/cookies/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, cookie_data: cookieData }),
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      } else {
        const errData = await response.json();
        return NextResponse.json({ error: errData.detail || 'Failed to upload cookies to session engine' }, { status: response.status });
      }
    }
  } catch (error: any) {
    console.warn('Python Session Engine is offline. Processing cookie action natively in TypeScript:', error.message);
  }

  // 2. Fallback: Native Node.js Cookie Manager
  try {
    const plat = platform.toLowerCase().trim();
    if (action === 'clear') {
      const success = clearCookiesForPlatform(plat);
      if (success) {
        return NextResponse.json({ message: `Successfully cleared cookies for ${platform.toUpperCase()}` });
      }
      return NextResponse.json({ error: `Failed to clear stored cookies for ${platform}` }, { status: 500 });
    }

    // Default: Upload
    if (!cookieData) {
      return NextResponse.json({ error: 'Cookie data content is required for import' }, { status: 400 });
    }

    const parsedCookies = parseCookieString(cookieData);
    if (parsedCookies.length === 0) {
      return NextResponse.json({ error: 'Malformed cookie string or empty content. Supports Netscape .txt, JSON exports, or standard cookie headers.' }, { status: 400 });
    }

    const success = saveCookiesForPlatform(plat, parsedCookies);
    if (success) {
      return NextResponse.json({ 
        message: `Successfully imported ${parsedCookies.length} session cookies natively for ${platform.toUpperCase()}` 
      });
    }
    return NextResponse.json({ error: 'Failed to encrypt and store cookies natively.' }, { status: 500 });

  } catch (err: any) {
    console.error('Error handling native cookie action:', err);
    return NextResponse.json({ error: 'Internal server error processing secure cookies.' }, { status: 500 });
  }
}

