import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const MODEL = 'gemini-3.6-flash';

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 21; i++) {
    const key = process.env[`GEMINI_KEY_${i}`]?.trim();
    if (key) keys.push(key);
  }
  return keys;
}

export async function GET() {
  const keys = getGeminiKeys();

  if (keys.length === 0) {
    return NextResponse.json({
      status: 'error',
      message: 'No GEMINI_KEY_N environment variables found. Add GEMINI_KEY_1, GEMINI_KEY_2... to Vercel env vars.',
      model: MODEL,
      keysFound: 0,
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(keys[0]);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent('Reply with exactly: OK');
    const text = result.response.text().trim();
    return NextResponse.json({
      status: 'ok',
      model: MODEL,
      keysFound: keys.length,
      testResponse: text,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      model: MODEL,
      keysFound: keys.length,
      error: err.message || String(err),
    });
  }
}
