import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Forward multipart form data directly to FastAPI backend
    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/analyze`, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — fetch sets it with boundary for multipart
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // If the Python backend is not running
    if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        {
          error:
            'Python backend is not running. Please start it with: cd backend && uvicorn main:app --reload',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
