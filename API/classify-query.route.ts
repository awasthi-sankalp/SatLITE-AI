import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-3.7-flash';

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 21; i++) {
    const key = process.env[`GEMINI_KEY_${i}`]?.trim();
    if (key) keys.push(key);
  }
  return keys;
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

    const promptText = `Does this remote sensing query require finding, counting, or analyzing very small/tiny objects (e.g., dustbins, cars, individual trees, small buildings)? Reply with exactly "HIGH" if yes, or "LOW" if it is a general landscape/large-scale query (e.g., floods, land cover, weather, generalized change). Query: "${query}"`;

    const keys = getGeminiKeys();
    let answer = 'LOW'; // default safe fallback
    
    for (let i = 0; i < keys.length; i++) {
      try {
        const genAI = new GoogleGenerativeAI(keys[i]);
        const model = genAI.getGenerativeModel({ model: MODEL });
        const result = await model.generateContent(promptText);
        answer = result.response.text().trim().toUpperCase();
        
        // Strict parsing
        if (answer.includes('HIGH')) answer = 'HIGH';
        else answer = 'LOW';
        
        break; // Break on first successful API call
      } catch (err: any) {
        const msg = err.message || String(err);
        const isRetryable = /quota|rate.limit|429|503|overload/i.test(msg);
        if (!isRetryable) break;
      }
    }

    return NextResponse.json({ resolution: answer });
  } catch (err) {
    return NextResponse.json({ resolution: 'LOW' }); // Fail safe to eco mode
  }
}
