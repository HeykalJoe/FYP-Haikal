/**
 * Extract most common words for a word cloud (local, not LLM)
 * Returns: [ [word, count], ... ]
 */
function extractWordFrequency(text, maxWords = 50) {
  const freq = {};
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .forEach(word => {
      if (word.length > 2) freq[word] = (freq[word] || 0) + 1;
    });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxWords);
}

/* --------------------------------------------------
   LOCAL MALAY (MS) NLP ANALYZER
   Uses keyword-based classification for better accuracy
   -------------------------------------------------- */

/**
 * Analyze sentiment for Malay text using keyword matching
 * Returns: [{ label, score }]
 */
function analyzeSentimentMalay(text) {
  const lowerText = text.toLowerCase();
  
  // Malay sentiment keywords
  const positiveWords = ['gembira', 'bahagia', 'senang', 'syukur', 'terima kasih', 'bagus', 'cantik', 'indah', 'suka', 'cinta', 'sayang', 'berjaya', 'lega', 'puas', 'OK', 'ok', 'okay', 'baik', 'seronok', 'best'];
  const negativeWords = ['sedih', 'kecewa', 'marah', 'benci', 'stress', 'tertekan', 'takut', 'risau', 'gelisah', 'susah', 'sakit', 'depress', 'murung', 'lemah', 'penat', 'letih', 'menyesal', 'gagal', 'putus asa', 'bunuh diri', 'mati'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  let label = 'neutral';
  let score = 0.5;
  
  if (positiveCount > negativeCount) {
    label = 'positive';
    score = Math.min(0.6 + (positiveCount * 0.1), 0.95);
  } else if (negativeCount > positiveCount) {
    label = 'negative';
    score = Math.min(0.6 + (negativeCount * 0.1), 0.95);
  } else if (positiveCount > 0 || negativeCount > 0) {
    label = 'neutral';
    score = 0.5;
  }
  
  return [{ label, score }];
}

/**
 * Classify topic for Malay text (Education vs Mental Health)
 * Returns: { labels, scores }
 */
function classifyTopicMalay(text) {
  const lowerText = text.toLowerCase();
  
  // Education keywords
  const educationWords = ['belajar', 'pelajaran', 'kelas', 'kuliah', 'exam', 'peperiksaan', 'ujian', 'assignment', 'tugasan', 'kerja kursus', 'akademik', 'markah', 'gred', 'grade', 'lecturer', 'pensyarah', 'guru', 'subjek', 'kursus', 'universiti', 'kolej', 'sekolah', 'latihan', 'pembelajaran'];
  
  // Mental health keywords
  const mentalHealthWords = ['mental', 'psikologi', 'emosi', 'perasaan', 'depress', 'kemurungan', 'stress', 'tekanan', 'gelisah', 'anxiety', 'kebimbangan', 'takut', 'trauma', 'bunuh diri', 'suicide', 'insomnia', 'tidur', 'kesihatan mental', 'terapi', 'kaunseling', 'counseling', 'kesepian', 'sunyi'];
  
  let educationCount = 0;
  let mentalHealthCount = 0;
  
  educationWords.forEach(word => {
    if (lowerText.includes(word)) educationCount++;
  });
  
  mentalHealthWords.forEach(word => {
    if (lowerText.includes(word)) mentalHealthCount++;
  });
  
  // Default to education if no clear match
  if (educationCount === 0 && mentalHealthCount === 0) {
    return { labels: ['Education'], scores: [0.5] };
  }
  
  const total = educationCount + mentalHealthCount;
  
  if (mentalHealthCount > educationCount) {
    const score = mentalHealthCount / total;
    return { labels: ['Mental Health'], scores: [score] };
  } else {
    const score = educationCount / total;
    return { labels: ['Education'], scores: [score] };
  }
}
/*=================================================================
  groqClient.js
  Updated to use the modern `/chat/completions` endpoint.
=================================================================*/

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

/* --------------------------------------------------
   1️⃣  Configuration – keep your own key here
   -------------------------------------------------- */
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/* The base URL is the “OpenAI‑compatible” one.  Note the `/openai`. */
const BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
/* Optional override for Malay-specific Groq model */
const GROQ_MS_MODEL = process.env.GROQ_MS_MODEL || 'llama-3.3-70b-versatile';

/* NOTE: This project uses GroqCloud for all NLP tasks. */

/* --------------------------------------------------
   2️⃣  Low‑level helper – talks to Groq
   -------------------------------------------------- */
async function runGroqModel(model, prompt) {
  const url = `${BASE_URL}/chat/completions`;
  if (!GROQ_API_KEY) {
    throw new Error('Missing GROQ_API_KEY environment variable');
  }

  const payload = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 512,
    stream: false,
  };

  // Timeout and retry
  const timeoutMs = 10000; // 10s
  const attempt = async () => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`GroqCloud error ${response.status}: ${txt}`);
      }

      const data = await response.json();
      const choice = data.choices && data.choices[0];
      if (!choice || !choice.message || typeof choice.message.content !== 'string') {
        throw new Error('Unexpected response format from GroqCloud');
      }
      return choice.message.content.trim();
    } finally {
      clearTimeout(id);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    // one retry with short backoff
    try {
      await new Promise(r => setTimeout(r, 500));
      return await attempt();
    } catch (err2) {
      throw err2;
    }
  }
}

/* (Hugging Face helpers removed) */

/* --------------------------------------------------
   3️⃣  Public API – keep the original export names
   -------------------------------------------------- */

/**
 * Sentiment analysis – returns [{ label, score }]
 * Example output: [{ label: "positive", score: 0.92 }]
 */
async function analyzeSentimentGroq(text) {
  const prompt = `
Analyze the sentiment of the following text and respond ONLY with a valid JSON object in this format:
{"label": "positive" | "negative" | "neutral", "score": <number between 0 and 1>}
No explanation, no extra text.

Text:
"${text}"
`;

  try {
    const model = (arguments.length > 1 && typeof arguments[1] === 'object' && arguments[1].lang === 'ms') ? GROQ_MS_MODEL : DEFAULT_MODEL;
    const raw = await runGroqModel(model, prompt.trim());
    // Extract JSON substring if extra text is present
    const match = raw.match(/{[\s\S]*}/);
    const jsonStr = match ? match[0] : raw;
    const parsed = JSON.parse(jsonStr);
    if (!parsed.label || parsed.score === undefined) {
      throw new Error('Unexpected sentiment JSON format');
    }
    return [{ label: parsed.label, score: parsed.score }];
  } catch (err) {
    return [{ label: 'error', score: 0, error: err.message }];
  }
}

/**
 * Topic categorization – returns { labels, scores }
 * Example output: { labels: ["Technology", "Health"], scores: [0.78, 0.22] }
 */
async function classifyTopicGroq(text) {
  const prompt = `
You are a topic classification assistant. Return ONLY a valid JSON object with two arrays: "labels" (top 5 topics) and "scores" (confidence scores 0-1, same order). No explanation, no extra text.

Example output:
{"labels": ["Technology", "Business"], "scores": [0.87, 0.13]}

Text:
"${text}"
`;

  try {
    const model = (arguments.length > 1 && typeof arguments[1] === 'object' && arguments[1].lang === 'ms') ? GROQ_MS_MODEL : DEFAULT_MODEL;
    const raw = await runGroqModel(model, prompt.trim());
    // Extract JSON substring if extra text is present
    const match = raw.match(/{[\s\S]*}/);
    const jsonStr = match ? match[0] : raw;
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed.labels) || !Array.isArray(parsed.scores)) {
      throw new Error('Unexpected classification JSON format');
    }
    return { labels: parsed.labels, scores: parsed.scores };
  } catch (err) {
    return { labels: ['error'], scores: [0], error: err.message };
  }
}

/* --------------------------------------------------
  Public router wrappers: route Malay to local analyzer, others to GroqCloud.
  -------------------------------------------------- */
async function analyzeSentiment(text, options = {}) {
  const lang = options && options.lang ? options.lang : (typeof options === 'string' ? options : 'en');
  
  // Use local keyword-based analyzer for Malay
  if (lang === 'ms') {
    return analyzeSentimentMalay(text);
  }
  
  // Use Groq for other languages
  return analyzeSentimentGroq(text, { lang });
}

async function classifyTopicZeroShot(text, options = {}) {
  const lang = options && options.lang ? options.lang : (typeof options === 'string' ? options : 'en');
  
  // Use local keyword-based classifier for Malay
  if (lang === 'ms') {
    return classifyTopicMalay(text);
  }
  
  // Use Groq for other languages
  return classifyTopicGroq(text, { lang });
}

/**
 * Summarization – returns [{ summary_text }]
 * Example output: [{ summary_text: "In short, the meeting..." }]
 */
async function summarizeTextGroq(text) {
  const prompt = `
Write a concise summary (2–3 sentences) of the following text.  
Respond ONLY with the summary text, no extra explanation.

Text:
"${text}"
`;

  try {
    const raw = await runGroqModel(DEFAULT_MODEL, prompt.trim());
    return [{ summary_text: raw }];
  } catch (err) {
    return [{ summary_text: '', error: err.message }];
  }
}

/**
 * Generate an early solution/advice snippet for a confessor based on their message and topic.
 * Returns a plain string with 2-4 short actionable suggestions or next steps.
 */
async function generateEarlySolutionGroq(text, topic) {
  // Safety: cap the confession length to avoid huge prompts
  const safeText = typeof text === 'string' && text.length > 3000 ? text.slice(0, 3000) + '...' : text;
  let prompt = `You are a compassionate, practical counselor. Given the user's confession and the primary topic, write a short "early solution" paragraph (2-4 short, actionable suggestions) tailored to the topic. Keep it empathetic and direct. Respond ONLY with the solution text.\n\nTopic: "${topic}"\n\nConfession: "${safeText}"`;

  try {
    const raw = await runGroqModel(DEFAULT_MODEL, prompt);
    return raw;
  } catch (err) {
    console.error('generateEarlySolutionGroq error:', err.message || err);
    return `We're sorry — we couldn't generate suggestions at this time.`;
  }
}

/* --------------------------------------------------
   4️⃣  Exported API
   -------------------------------------------------- */
module.exports = {
  analyzeSentiment,
  classifyTopicZeroShot,
  summarizeText: summarizeTextGroq,
  generateEarlySolution: generateEarlySolutionGroq,
  extractWordFrequency,
};