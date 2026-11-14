import { NextRequest, NextResponse } from 'next/server';

// Requests remain same-origin in the browser. Python/FastAPI runs separately.
// Configure SPELLING_API_URL *on the Next.js server*, never in client JS.
const ACTIONS = new Set(['start', 'answer', 'next', 'pronounce', 'end']);

function backendUrl(): string | null {
  const configured = process.env.SPELLING_API_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  // Local developer experience only; never silently point production to localhost.
  return process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : null;
}

function unavailable(message: string) {
  return NextResponse.json({ detail: message }, { status: 503 });
}

async function forward(path: string, method: 'GET' | 'POST', body?: string) {
  const base = backendUrl();
  if (!base) {
    return unavailable('Spelling Bee server is not configured. Set SPELLING_API_URL on your Next.js host to your deployed Python/FastAPI server URL.');
  }
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    // Return JSON errors too; the frontend shows the backend's helpful detail.
    const content = await response.text();
    let data: unknown;
    try { data = JSON.parse(content); }
    catch { return unavailable('The Python backend returned an unexpected response. Check its server logs.'); }
    return NextResponse.json(data, { status: response.status });
  } catch {
    return unavailable(process.env.NODE_ENV === 'development'
      ? 'Cannot reach the Python Spelling Bee backend. Check SPELLING_API_URL in website/frontend/.env.local and run: cd website/backend && python -m uvicorn api:app --reload --port 8000'
      : 'Cannot reach the Python Spelling Bee backend. Check SPELLING_API_URL and that the backend is running.');
  }
}

type Context = { params: Promise<{ action: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { action } = await context.params;
  if (action !== 'health') return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  return forward('/health', 'GET');
}

export async function POST(request: NextRequest, context: Context) {
  const { action } = await context.params;
  if (!ACTIONS.has(action)) return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  const body = await request.text();
  if (body.length > 4096) return NextResponse.json({ detail: 'Request too large' }, { status: 413 });
  return forward(`/spelling_bee/${action}`, 'POST', body);
}
