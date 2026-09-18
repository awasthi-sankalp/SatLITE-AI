import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

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

async function callGeminiWithRotation(imageParts: Part[], promptText: string): Promise<{ answer: string; keyIndex: number; tokensUsed: number }> {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API keys configured. Add GEMINI_KEY_1 … GEMINI_KEY_21 to your Vercel environment variables.');
  }

  const errors: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(keys[i]);
      const model = genAI.getGenerativeModel({ model: MODEL });
      const result = await model.generateContent([...imageParts, { text: promptText }]);
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
      console.warn(`Gemini key ${i + 1} failed: ${msg}`);
      errors.push(`Key ${i + 1}: ${msg}`);
      const isRetryable = /quota|rate.limit|429|503|overload|resource.exhausted/i.test(msg);
      if (!isRetryable) break;
    }
  }

  throw new Error(`All ${keys.length} Gemini key(s) failed.\n${errors.join('\n')}`);
}


const RS_SYSTEM = `You are SatLITE AI, a remote sensing parameter extractor.
CRITICAL RULES:
1. OUTPUT STRICT JSON ONLY. No markdown wrappers (no \`\`\`json), no text outside JSON.
2. If invalid image, output: {"error": "Not a satellite image."}
3. Keep text values extremely short (1-3 words max). Tokens are heavily penalized.
4. If asked to find objects, include a "boxes" array in the JSON. Format: {"boxes": [{"box": [ymin, xmin, ymax, xmax], "label": "ShortLabel"}]}. Coordinates 0-1000.`;

const PROMPTS: Record<string, string> = {
  single_vqa: `{query}\nOutput JSON format: {"answer": "short fact", "confidence": "High/Med/Low"}`,

  single_caption: `{query}\nOutput JSON format: {"scene": "type", "land_cover": "type", "objects": ["obj1", "obj2"], "anomalies": ["none"]}`,

  single_grounding: `{query}\nOutput JSON format: {"summary": "found X targets", "boxes": [{"box": [ymin, xmin, ymax, xmax], "label": "..."}]}`,

  change_description: `Images: 1 (earlier) and 2 (later). {query}\nOutput JSON format: {"change_type": "type", "location": "where", "magnitude": "High/Low", "confidence": "High/Low", "summary": "short summary"}`,

  change_vqa: `Images: 1 (earlier) and 2 (later). {query}\nOutput JSON format: {"answer": "short fact", "confidence": "High/Low"}`,

  cross_modal: `Images: 1 (Optical) and 2 (SAR). {query}\nOutput JSON format: {"optical_feat": ["f1"], "sar_feat": ["f1"], "fusion": "insight", "builtup_pts": [[y,x]], "change_pts": [[y,x]], "confidence": "High/Low"}`,
};

type TaskType =
  | 'single_vqa'
  | 'single_caption'
  | 'single_grounding'
  | 'change_description'
  | 'change_vqa'
  | 'cross_modal';

const TASK_KEYWORDS: Record<string, string[]> = {
  single_caption: ['describe', 'caption', 'what is in', 'scene', 'overview', 'summary',
    'explain', 'tell me about', 'what do you see', 'land cover', 'land use',
    'objects visible', 'major objects', 'features'],
  single_grounding: ['highlight', 'locate', 'where is', 'show me', 'mark',
    'find', 'point out', 'region', 'area of'],
  change_description: ['changed', 'change between', 'difference', 'what happened',
    'before and after', 'temporal', 'over time', 'two dates', 'modified',
    'deforestation', 'urbanization', 'flood', 'disaster'],
  change_vqa: ['has the', 'did the', 'how much', 'increased', 'decreased',
    'remained', 'built-up area', 'water level', 'forest cover'],
  cross_modal: ['sar', 'optical and sar', 'radar', 'sentinel-1', 'risat',
    'complementary', 'fusion', 'both images', 'together', 'cross-modal',
    'water-covered', 'built-up and water'],
};

const TASK_LABELS: Record<TaskType, string> = {
  single_vqa: 'Single-Image Visual Question Answering',
  single_caption: 'Single-Image Scene Description & Captioning',
  single_grounding: 'Text-Guided Region Grounding',
  change_description: 'Bi-temporal Change Description',
  change_vqa: 'Change-based Visual Question Answering',
  cross_modal: 'Optical–SAR Cross-modal Joint Analysis',
};

function classifyTask(query: string, imageCount: number, mode: string): TaskType {
  const q = query.toLowerCase();
  if (mode === 'crossmodal' && imageCount === 2) return 'cross_modal';
  if (mode === 'bitemporal' && imageCount === 2) {
    return TASK_KEYWORDS.change_vqa.some((kw) => q.includes(kw))
      ? 'change_vqa'
      : 'change_description';
  }
  const scores: Record<string, number> = {};
  for (const [task, kws] of Object.entries(TASK_KEYWORDS)) {
    scores[task] = kws.filter((kw) => q.includes(kw)).length;
  }
  const singleTasks: TaskType[] = ['single_caption', 'single_grounding', 'single_vqa'];
  const best = singleTasks.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
  return scores[best] > 0 ? best : 'single_vqa';
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const formData = await request.formData();
    const query = (formData.get('query') as string)?.trim();
    const mode = (formData.get('mode') as string) || 'single';
    const imageFiles = formData.getAll('images') as File[];

    if (!query) return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    if (!imageFiles.length) return NextResponse.json({ error: 'At least one image is required.' }, { status: 400 });

    const required = mode === 'single' ? 1 : 2;
    if (mode !== 'single' && imageFiles.length < 2) {
      return NextResponse.json(
        { error: `${mode} mode requires 2 images, got ${imageFiles.length}.` },
        { status: 422 }
      );
    }

    const imageParts: Part[] = await Promise.all(
      imageFiles.slice(0, required).map(async (file) => {
        const bytes = await file.arrayBuffer();
        const b64 = Buffer.from(bytes).toString('base64');
        const mime = file.type || 'image/jpeg';
        return { inlineData: { mimeType: mime, data: b64 } } as Part;
      })
    );

    const task = classifyTask(query, imageFiles.length, mode);
    const promptTemplate = PROMPTS[task] || PROMPTS.single_vqa;
    const promptText = `${RS_SYSTEM}\n\nTask: ${promptTemplate.replace('{query}', query)}`;

    const { answer, keyIndex, tokensUsed } = await callGeminiWithRotation(imageParts, promptText);

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    return NextResponse.json({
      answer,
      execution_summary: {
        task: TASK_LABELS[task],
        model: `${MODEL} (key ${keyIndex})`,
        rs_adaptation: 'System rules enforced for satellite validity and domain terminology.',
        mode,
        image_count: imageParts.length,
        elapsed_seconds: parseFloat(elapsed),
        tokens_used: tokensUsed,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isQuota = /quota|rate.limit|429|resource.exhausted/i.test(message);
    return NextResponse.json(
      {
        error: isQuota
          ? 'All API keys are quota-exhausted. Google resets free-tier quotas at midnight Pacific (12:30 AM IST). Please try again later.'
          : message,
      },
      { status: isQuota ? 429 : 500 }
    );
  }
}



