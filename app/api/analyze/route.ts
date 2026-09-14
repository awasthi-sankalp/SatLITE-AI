import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export const maxDuration = 60; 

const MODEL = 'gemini-3.7-flash';

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


const RS_SYSTEM = `You are SatLITE AI, an expert remote sensing analyst.

CRITICAL RULES:
1. IMAGE VALIDATION: If the image is not a satellite, aerial, or remote sensing image, reply EXACTLY: "Error: This is not a valid satellite image." and STOP.
2. QUERY VALIDATION: If the query is unrelated to earth observation, reply EXACTLY: "Error: I can only answer questions related to satellite image analysis." and STOP.
3. ABSOLUTE CONCISENESS: Output ONLY the requested data. Use highly dense bullet points. Omit ALL conversational filler (e.g., "Here is the analysis", "Based on the image"). Stop generating text immediately once the core question is answered.
4. OBJECT MARKING: If the user asks to "mark", "locate", "box", or "find" objects, you must NEVER output JSON. Instead, follow these 2 steps EXACTLY:
   Step 1: Write a concise plain-text bulleted list describing the object and its location in words (e.g. "- Volcano: Top-left area").
   Step 2: On a new line at the very bottom, output the bounding boxes in this RAW text format: [ymin, xmin, ymax, xmax] LabelName
Coordinates must be integers from 0 to 1000 representing relative position. Example:
[450, 200, 500, 300] Target Vehicle`;

const PROMPTS: Record<string, string> = {
  single_vqa: `{query}
Output a direct, exact answer with brief visual evidence.`,

  single_caption: `{query}
Output highly dense bullet points:
- Scene type
- Major land-cover
- Notable objects
- Anomalies`,

  single_grounding: `{query}
Provide precise bounding boxes for the requested features using the format: [ymin, xmin, ymax, xmax] LabelName.`,

  change_description: `Images: 1 (earlier) and 2 (later).
{query}
Perform change analysis via dense bullet points:
- Summary of changes
- Change Type
- Location
- Magnitude
- Confidence`,

  change_vqa: `Images: 1 (earlier) and 2 (later).
{query}
Answer directly based on comparative visual evidence.`,

  cross_modal: `Images: 1 (Optical) and 2 (SAR).
{query}
Provide joint cross-modal analysis via dense bullet points:
- Optical features
- SAR features
- Fusion insights
- Target Identification
- Confidence`,
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



