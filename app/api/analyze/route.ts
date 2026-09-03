import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

// ── Gemini setup ──────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const MODEL = 'gemini-2.0-flash';

// ── Remote Sensing system prompt ──────────────────────────────────────────────
const RS_SYSTEM = `You are SatQuery AI, an expert remote sensing analyst specializing in:
- Satellite imagery interpretation (optical, multispectral, SAR)
- Land-use and land-cover (LULC) classification
- Change detection between multi-temporal images
- SAR (Synthetic Aperture Radar) and optical image fusion
- Visual question answering over geospatial imagery

Always provide precise, evidence-grounded answers using domain-specific terminology
(e.g., backscatter, spectral bands, NDVI, built-up area, impervious surface).
State your confidence level (High/Medium/Low) when relevant.`;

// ── Task-specific prompt templates ────────────────────────────────────────────
const PROMPTS: Record<string, string> = {
  single_vqa: `{query}

Analyze this satellite/aerial image carefully. Provide:
- Direct answer to the question
- Supporting visual evidence from the image
- Confidence level (High/Medium/Low)`,

  single_caption: `Provide a detailed remote sensing scene description.

Include:
1. Overall scene type (urban, agricultural, forested, coastal, etc.)
2. Major land-cover classes and their approximate spatial distribution
3. Notable objects or structures (roads, buildings, water bodies, vegetation)
4. Any anomalies or points of interest

Query context: {query}`,

  single_grounding: `{query}

Identify and describe the spatial location of the requested feature(s).
Use directional terms (top-left, center, bottom-right) and approximate
proportion of the image the feature occupies.`,

  change_description: `You are given two satellite images of the SAME area at DIFFERENT times.
Image 1 = earlier date. Image 2 = later date.

{query}

Perform change analysis:
1. **Summary**: Most significant changes observed
2. **Change Type**: Urban expansion, deforestation, flooding, agricultural change, etc.
3. **Location**: Where in the image did changes occur?
4. **Magnitude**: Minor / Moderate / Major
5. **Confidence**: High / Medium / Low`,

  change_vqa: `You are given two satellite images of the SAME area at DIFFERENT times.
Image 1 = earlier date. Image 2 = later date.

{query}

Answer directly based on comparing both images with visual evidence.`,

  cross_modal: `You are given two co-registered images of the SAME area:
- Image 1: Optical/Multispectral satellite image
- Image 2: SAR (Synthetic Aperture Radar) image

{query}

Provide joint cross-modal analysis:
1. **Optical Analysis**: Land cover, color, texture visible
2. **SAR Analysis**: Backscatter patterns, surface roughness, double-bounce from buildings, water specular reflection
3. **Fusion Insights**: What combining both modalities reveals
4. **Feature Identification**: Identify requested features using both sources
5. **Confidence**: Per-feature confidence level`,
};

// ── Task Classifier (TypeScript port) ─────────────────────────────────────────
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

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const start = Date.now();

  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: 'GOOGLE_API_KEY is not configured. Add it to your Vercel environment variables.' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const query = (formData.get('query') as string)?.trim();
    const mode = (formData.get('mode') as string) || 'single';
    const imageFiles = formData.getAll('images') as File[];

    if (!query) return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    if (!imageFiles.length) return NextResponse.json({ error: 'At least one image is required.' }, { status: 400 });

    // Validate image count vs mode
    const required = mode === 'single' ? 1 : 2;
    if (mode !== 'single' && imageFiles.length < 2) {
      return NextResponse.json(
        { error: `${mode} mode requires 2 images, got ${imageFiles.length}.` },
        { status: 422 }
      );
    }

    // Convert images to Gemini inline parts
    const imageParts: Part[] = await Promise.all(
      imageFiles.slice(0, required).map(async (file) => {
        const bytes = await file.arrayBuffer();
        const b64 = Buffer.from(bytes).toString('base64');
        const mime = file.type || 'image/jpeg';
        return { inlineData: { mimeType: mime, data: b64 } } as Part;
      })
    );

    // Classify task & build prompt
    const task = classifyTask(query, imageFiles.length, mode);
    const promptTemplate = PROMPTS[task] || PROMPTS.single_vqa;
    const promptText = promptTemplate.replace('{query}', query);

    // Call Gemini
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: RS_SYSTEM,
    });
    const result = await model.generateContent([...imageParts, { text: promptText }]);
    const answer = result.response.text().trim();

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    return NextResponse.json({
      answer,
      execution_summary: {
        task: TASK_LABELS[task],
        task_id: task,
        model: MODEL,
        rs_adaptation:
          'BigEarthNet.txt-aligned RS domain vocabulary injected as system prompt. ' +
          'Gemini 1.5 Flash with remote sensing specialist context.',
        mode,
        image_count: imageParts.length,
        images: imageFiles.map((f) => ({
          filename: f.name,
          format: f.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
          dimensions: 'N/A',
        })),
        query,
        elapsed_seconds: parseFloat(elapsed),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
