import { NextResponse } from 'next/server';

export async function GET() {
  const text = `User-agent: *
Disallow:
Allow: /
Sitemap: https://savex.app/sitemap.xml
`; 
  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
