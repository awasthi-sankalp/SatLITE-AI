'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
type Mode = 'single' | 'bitemporal' | 'crossmodal';

interface ImageSlot {
  file: File;
  preview: string;
  label: string;
}

interface ExecutionSummary {
  task: string;
  task_id: string;
  model: string;
  rs_adaptation: string;
  mode: string;
  image_count: number;
  images: { filename: string; dimensions: string; format: string }[];
  query: string;
  elapsed_seconds: number;
  tokens_used: number;
}

interface AnalysisResult {
  answer: string;
  execution_summary: ExecutionSummary;
}

// ── Mode config ─────────────────────────────────────────────────────────────
const MODES: { id: Mode; label: string; description: string; slots: string[] }[] = [
  {
    id: 'single',
    label: 'Single Image',
    description: 'VQA, captioning, or region grounding on one image',
    slots: ['Image'],
  },
  {
    id: 'bitemporal',
    label: 'Bi-temporal Pair',
    description: 'Change detection between two dates',
    slots: ['Earlier Image', 'Later Image'],
  },
  {
    id: 'crossmodal',
    label: 'Optical + SAR',
    description: 'Joint analysis of optical and SAR imagery',
    slots: ['Optical Image', 'SAR Image'],
  },
];

const SAMPLE_QUERIES: Record<Mode, string[]> = {
  single: [
    'Describe the land-cover and major objects visible in this image.',
    'What is the dominant land-use type in this scene?',
    'Highlight the water body referred to in the query.',
  ],
  bitemporal: [
    'What changed between these two dates, and where did the change occur?',
    'Has the built-up area increased, decreased, or remained unchanged?',
    'Describe any signs of deforestation or vegetation loss.',
  ],
  crossmodal: [
    'Use the optical and SAR images together to identify built-up and water-covered regions.',
    'What features are visible in the SAR image that are not clear in the optical image?',
    'Identify flooded areas using both optical and SAR imagery.',
  ],
};

// ── Component ────────────────────────────────────────────────────────────────
export default function DashboardClient() {
  const [mode, setMode] = useState<Mode>('single');
  const [slots, setSlots] = useState<(ImageSlot | null)[]>([null]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [markedImage, setMarkedImage] = useState<string | null>(null);
  const [cleanAnswer, setCleanAnswer] = useState<string | null>(null);

  // Rolling 60-second token history
  const [tokenHistory, setTokenHistory] = useState<{ts: number, val: number}[]>([]);
  const [tokensRemaining, setTokensRemaining] = useState<number>(21000000);

  useEffect(() => {
    // Load history on mount
    const saved = localStorage.getItem('satlite_token_history');
    if (saved) {
      try { setTokenHistory(JSON.parse(saved)); } catch(e) {}
    }

    // Check every second to remove tokens older than 60 seconds
    const interval = setInterval(() => {
      setTokenHistory(prev => {
        const now = Date.now();
        const valid = prev.filter(x => now - x.ts < 60000);
        if (valid.length !== prev.length) {
          localStorage.setItem('satlite_token_history', JSON.stringify(valid));
          return valid;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Recalculate remaining pool (1M TPM * 21 keys = 21M)
  useEffect(() => {
    const used = tokenHistory.reduce((acc, curr) => acc + curr.val, 0);
    setTokensRemaining(21000000 - used);
  }, [tokenHistory]);

  // Update slot count when mode changes
  const handleModeChange = (m: Mode) => {
    setMode(m);
    const slotCount = MODES.find((x) => x.id === m)!.slots.length;
    setSlots(Array(slotCount).fill(null));
    setResult(null);
    setError(null);
    setMarkedImage(null);
    setCleanAnswer(null);
  };

const resizeImage = (file: File, maxWidth: number = 1024): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          const ratio = Math.min(maxWidth / width, maxWidth / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(new File([blob], file.name, { type: 'image/jpeg' })) : resolve(file),
          'image/jpeg',
          0.85 // Compress to 85% quality JPEG
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

const processMarkedImage = async (originalFile: File, answerText: string) => {
  // Regex to find Gemini 1.5 bounding boxes: [ymin, xmin, ymax, xmax] Optional Label
  const boxRegex = /\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]([^\n]*)/g;
  const boxes: {ymin: number, xmin: number, ymax: number, xmax: number, label: string}[] = [];
  let match;

  while ((match = boxRegex.exec(answerText)) !== null) {
    boxes.push({
      ymin: parseInt(match[1]),
      xmin: parseInt(match[2]),
      ymax: parseInt(match[3]),
      xmax: parseInt(match[4]),
      label: match[5] ? match[5].replace(/^[^\w]+/, '').trim() : ''
    });
  }

  if (boxes.length === 0) {
    return { cleanText: answerText, markedUrl: null };
  }

  // Strip bounding boxes from the text that will be shown to the user
  const cleanText = answerText.replace(/\[\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\]/g, '').trim();

  return new Promise<{cleanText: string, markedUrl: string | null}>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ cleanText, markedUrl: null });

      ctx.drawImage(img, 0, 0);

      boxes.forEach(box => {
        const y = (box.ymin / 1000) * canvas.height;
        const x = (box.xmin / 1000) * canvas.width;
        const h = ((box.ymax - box.ymin) / 1000) * canvas.height;
        const w = ((box.xmax - box.xmin) / 1000) * canvas.width;

        // Draw bounding box
        ctx.strokeStyle = '#3b82f6'; // blue-500
        ctx.lineWidth = Math.max(3, canvas.width / 300);
        ctx.strokeRect(x, y, w, h);

        // Draw label
        if (box.label) {
          const fontSize = Math.max(16, canvas.width / 50);
          ctx.font = `bold ${fontSize}px sans-serif`;
          const textWidth = ctx.measureText(box.label).width;
          const textHeight = fontSize;

          // Label background
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(x, y - textHeight - 8, textWidth + 16, textHeight + 8);

          // Label text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(box.label, x + 8, y - 8);
        }
      });

      resolve({ cleanText, markedUrl: canvas.toDataURL('image/jpeg', 0.9) });
    };
    img.onerror = () => resolve({ cleanText, markedUrl: null });
    img.src = URL.createObjectURL(originalFile);
  });
};

  const handleFile = useCallback((index: number, file: File) => {
    const preview = URL.createObjectURL(file);
    const label = MODES.find((m2) => m2.id === mode)!.slots[index];
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { file, preview, label };
      return next;
    });
  }, [mode]);

  const handleDrop = useCallback(
    (index: number, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(index, file);
    },
    [handleFile]
  );

  const removeSlot = (index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!query.trim()) { setError('Please enter a query.'); return; }
    const filled = slots.filter(Boolean);
    if (filled.length === 0) { setError('Please upload at least one image.'); return; }
    const requiredCount = MODES.find((m2) => m2.id === mode)!.slots.length;
    if (filled.length < requiredCount) {
      setError(`Please upload all ${requiredCount} images for ${mode} mode.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setMarkedImage(null);
    setCleanAnswer(null);

    try {
      // ── 1. Pre-flight query check ──
      let maxWidth = 512; // Eco Mode Default
      try {
        const classRes = await fetch('/api/classify-query', {
          method: 'POST',
          body: JSON.stringify({ query }),
          headers: { 'Content-Type': 'application/json' }
        });
        if (classRes.ok) {
          const classData = await classRes.json();
          if (classData.resolution === 'HIGH') maxWidth = 1024;
        }
      } catch (e) {
        console.warn('Pre-flight classification failed, defaulting to Eco Mode', e);
      }

      // ── 2. Compress Images Dynamically ──
      const resizedFiles = await Promise.all(
        slots.map(async (slot) => {
          if (!slot) return null;
          return await resizeImage(slot.file, maxWidth);
        })
      );

      // ── 3. Build & Send Form ──
      const form = new FormData();
      form.append('query', query);
      form.append('mode', mode);
      for (const file of resizedFiles) {
        if (file) form.append('images', file);
      }

      const res = await fetch('/api/analyze', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      
      if (slots[0]?.file && data.answer) {
        const { cleanText, markedUrl } = await processMarkedImage(slots[0].file, data.answer);
        setCleanAnswer(cleanText);
        setMarkedImage(markedUrl);
      } else {
        setCleanAnswer(data.answer);
        setMarkedImage(null);
      }
      
      setResult(data);
      if (typeof data.execution_summary?.tokens_used === 'number') {
        setTokenHistory(prev => {
          const next = [...prev, { ts: Date.now(), val: data.execution_summary.tokens_used }];
          localStorage.setItem('satlite_token_history', JSON.stringify(next));
          return next;
        });
      }
      setSummaryOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const currentMode = MODES.find((m2) => m2.id === mode)!;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-16 pt-4">

      {/* ── Mode Selector ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {MODES.map((m2) => (
          <button
            key={m2.id}
            onClick={() => handleModeChange(m2.id)}
            className={`px-4 py-2 text-sm font-medium border transition-colors rounded-none ${
              mode === m2.id
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-gray-400 hover:border-black'
            }`}
          >
            {m2.label}
          </button>
        ))}
        <span className="text-xs text-gray-500 self-center ml-1">
          {currentMode.description}
        </span>
      </div>

      {/* ── Image Upload Slots ── */}
      <div className={`grid gap-4 mb-6 ${slots.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {currentMode.slots.map((slotLabel, i) => (
          <div key={i}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              {slotLabel}
            </p>
            {slots[i] ? (
              <div className="relative border border-gray-300 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slots[i]!.preview}
                  alt={slotLabel}
                  className="w-full object-cover"
                  style={{ maxHeight: '280px' }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
                <button
                  onClick={() => removeSlot(i)}
                  className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {slots[i]!.file.name}
                </p>
              </div>
            ) : (
              <div
                onDrop={(e) => handleDrop(i, e)}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRefs.current[i]?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-black cursor-pointer transition-colors flex flex-col items-center justify-center py-12 text-center"
              >
                <svg className="w-8 h-8 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-600">Drop image here or <span className="underline">browse</span></p>
                <p className="text-xs text-gray-400 mt-1">GeoTIFF, TIFF, PNG, JPEG</p>
                <input
                  type="file"
                  accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[i] = el; }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(i, f);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Sample Query Chips ── */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {SAMPLE_QUERIES[mode].map((q) => (
          <button
            key={q}
            onClick={() => setQuery(q)}
            className="text-xs border border-gray-300 px-2 py-1 hover:border-black hover:bg-gray-50 transition-colors text-left leading-snug"
          >
            {q.length > 60 ? q.slice(0, 57) + '…' : q}
          </button>
        ))}
      </div>

      {/* ── Query Input ── */}
      <div className="flex gap-2 mb-6">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about the image(s)…"
          rows={3}
          className="flex-1 border border-gray-400 p-3 text-sm text-black bg-white focus:outline-none focus:border-black resize-none rounded-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-3 bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:bg-gray-400 transition-colors self-stretch rounded-none"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyzing
            </span>
          ) : (
            'Analyze →'
          )}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="border border-red-400 bg-red-50 text-red-700 p-4 text-sm mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="border border-gray-200 p-6 mb-4">
          <h2 className="font-bold text-lg mb-1">Analysis Result</h2>
          <p className="text-xs text-gray-500 mb-4">
            Task: <span className="font-medium text-black">{result.execution_summary.task}</span>
            {' · '}
            {result.execution_summary.elapsed_seconds}s
          </p>

          <div className="text-sm leading-relaxed whitespace-pre-wrap text-black mb-6">
            {cleanAnswer || result.answer}
          </div>
          
          {markedImage && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black opacity-80 mb-2 border-b pb-1">
                Visual Marking
              </h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={markedImage} alt="Marked result" className="max-w-full rounded border border-gray-300" />
            </div>
          )}

          {/* Execution Summary Accordion */}
          <button
            onClick={() => setSummaryOpen((o) => !o)}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-black transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${summaryOpen ? 'rotate-90' : ''}`}
              fill="currentColor" viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 4.707a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" />
            </svg>
            Execution Summary
          </button>

          {summaryOpen && (
            <div className="mt-3 text-xs text-gray-600 space-y-1 bg-gray-50 p-4 border border-gray-200">
              <p><span className="font-medium">Task ID:</span> {result.execution_summary.task_id}</p>
              <p><span className="font-medium">Model:</span> {result.execution_summary.model}</p>
              <p><span className="font-medium">Mode:</span> {result.execution_summary.mode}</p>
              <p><span className="font-medium">Images:</span>{' '}
                {result.execution_summary.images.map((img) =>
                  `${img.filename} (${img.format}, ${img.dimensions})`
                ).join(' | ')}
              </p>
              <p><span className="font-medium">RS Adaptation:</span>{' '}
                {result.execution_summary.rs_adaptation}
              </p>
              <p><span className="font-medium">Elapsed:</span> {result.execution_summary.elapsed_seconds}s</p>

              {/* Download JSON report */}
              <button
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify(result, null, 2)],
                    { type: 'application/json' }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `satquery_report_${Date.now()}.json`;
                  a.click();
                }}
                className="mt-2 inline-block border border-gray-400 px-3 py-1 hover:border-black text-black transition-colors"
              >
                ↓ Download Report (JSON)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Token Debugger ── */}
      {tokensRemaining !== null && (
        <div className="fixed bottom-4 left-4 text-black text-sm z-50 pointer-events-none font-medium bg-white/80 p-1 rounded">
          Tokens Remaining (10L/window): {tokensRemaining.toLocaleString('en-IN')}
          {(21000000 - tokensRemaining) > 0 && ` | Used Tokens: ${(21000000 - tokensRemaining).toLocaleString('en-IN')}`}
        </div>
      )}

    </div>
  );
}
