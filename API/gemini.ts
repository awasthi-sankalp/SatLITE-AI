import { GoogleGenerativeAI, Part } from '@google/generative-ai';

const MODEL = 'gemini-3.7-flash';

export function getGeminiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 21; i++) {
    const key = process.env['GEMINI_KEY_' + i]?.trim();
    if (key) keys.push(key);
  }
  return keys;
}

export async function callGeminiWithRotation(
  promptText: string,
  imageParts: Part[] = []
): Promise<{ answer: string; keyIndex: number; tokensUsed: number }> {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured. Add GEMINI_KEY_1 ... GEMINI_KEY_21 to your Vercel environment variables.');
  }

  const errors: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(keys[i]);
      const model = genAI.getGenerativeModel({ model: MODEL });
      
      const contents = imageParts.length > 0 
        ? [...imageParts, { text: promptText }] 
        : [{ text: promptText }];
        
      const result = await model.generateContent(contents);
      const answer = result.response.text().trim();
      
      let tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
      if (tokensUsed === 0) {
        const imageTokens = imageParts.length * 258;
        const textTokens = Math.ceil((promptText.split(' ').length + answer.split(' ').length) * 1.5);
        tokensUsed = imageTokens + textTokens;
      }
      
      return { answer, keyIndex: i + 1, tokensUsed };
    } catch (err: any) {
      const msg = err.message || String(err);
      console.warn('Gemini key ' + (i + 1) + ' failed: ' + msg);
      errors.push('Key ' + (i + 1) + ': ' + msg);
      const isRetryable = /quota|rate.limit|429|503|overload|resource.exhausted/i.test(msg);
      if (!isRetryable) break;
    }
  }

  throw new Error('All ' + keys.length + ' Gemini key(s) failed.\n' + errors.join('\n'));
}


