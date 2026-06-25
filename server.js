// Load local environment variables from a .env file in development
try { require('dotenv').config(); } catch(e) { /* ignore if dotenv not installed */ }

const express = require("express");
const app = express();
const { analyzeSentiment, classifyTopicZeroShot, summarizeText, generateEarlySolution } = require("./nlp");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const db = require("./db");
const ENABLE_USER_SUGGESTIONS = process.env.ENABLE_USER_SUGGESTIONS === '1' || process.env.ENABLE_USER_SUGGESTIONS === 'true';

// Startup checks for required sensitive environment variables
// By default we warn instead of failing — this allows running the server in development without SMTP/GROQ.
if (!process.env.SMTP_PASS) {
  console.warn('Warning: SMTP_PASS environment variable is not set. Email sending may fail or be disabled.');
}

if (ENABLE_USER_SUGGESTIONS && !process.env.GROQ_API_KEY) {
  console.warn('Warning: ENABLE_USER_SUGGESTIONS is enabled but GROQ_API_KEY is not set. Suggestions will fall back to a safe message.');
}
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));


// API: Sentiment distribution for all time (overall)
app.get('/api/sentimentdist/overall', (req, res) => {
  db.query('SELECT sentiment, COUNT(*) as count FROM confessions GROUP BY sentiment', [], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ sentiments: results });
  });
});

// API: Sentiment distribution for a specific year
app.get('/api/sentimentdist/year/:year', (req, res) => {
  const { year } = req.params;
  db.query('SELECT sentiment, COUNT(*) as count FROM confessions WHERE YEAR(created_at) = ? GROUP BY sentiment', [year], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ sentiments: results });
  });
});

// API: Sentiment distribution for a specific month
app.get('/api/sentimentdist/month/:year/:month', (req, res) => {
  const { year, month } = req.params;
  db.query('SELECT sentiment, COUNT(*) as count FROM confessions WHERE YEAR(created_at) = ? AND MONTH(created_at) = ? GROUP BY sentiment', [year, month], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ sentiments: results });
  });
});

// API: Sentiment distribution for a specific week (year + ISO week number)
app.get('/api/sentimentdist/week/:year/:week', (req, res) => {
  const { year, week } = req.params;
  db.query('SELECT sentiment, COUNT(*) as count FROM confessions WHERE YEAR(created_at) = ? AND WEEK(created_at,1) = ? GROUP BY sentiment', [year, week], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ sentiments: results });
  });
});

// API: Sentiment distribution for a specific day of week
app.get('/api/sentimentdist/day/:day', (req, res) => {
  const { day } = req.params;
  db.query('SELECT sentiment, COUNT(*) as count FROM confessions WHERE DAYOFWEEK(created_at) = ? GROUP BY sentiment', [day], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ sentiments: results });
  });
});

// API: Sentiment distribution for a specific date
app.get('/api/sentimentdist', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Missing date' });
  db.query('SELECT sentiment, COUNT(*) as count FROM confessions WHERE DATE(created_at) = ? GROUP BY sentiment', [date], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ sentiments: results });
  });
});

// API: Topic distribution for all time (overall)
app.get('/api/topicdist/overall', (req, res) => {
  db.query('SELECT topic, COUNT(*) as count FROM confessions GROUP BY topic', [], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ topics: results });
  });
});

// API: Topic distribution for a specific year
app.get('/api/topicdist/year/:year', (req, res) => {
  const { year } = req.params;
  db.query('SELECT topic, COUNT(*) as count FROM confessions WHERE YEAR(created_at) = ? GROUP BY topic', [year], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ topics: results });
  });
});

// API: Topic distribution for a specific month
app.get('/api/topicdist/month/:year/:month', (req, res) => {
  const { year, month } = req.params;
  db.query('SELECT topic, COUNT(*) as count FROM confessions WHERE YEAR(created_at) = ? AND MONTH(created_at) = ? GROUP BY topic', [year, month], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ topics: results });
  });
});

// API: Topic distribution for a specific week (year + ISO week number)
app.get('/api/topicdist/week/:year/:week', (req, res) => {
  const { year, week } = req.params;
  db.query('SELECT topic, COUNT(*) as count FROM confessions WHERE YEAR(created_at) = ? AND WEEK(created_at,1) = ? GROUP BY topic', [year, week], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ topics: results });
  });
});

// API: Topic distribution for a specific day of week
app.get('/api/topicdist/day/:day', (req, res) => {
  const { day } = req.params;
  db.query('SELECT topic, COUNT(*) as count FROM confessions WHERE DAYOFWEEK(created_at) = ? GROUP BY topic', [day], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ topics: results });
  });
});

// API: Topic distribution for a specific date
app.get('/api/topicdist', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Missing date' });
  db.query('SELECT topic, COUNT(*) as count FROM confessions WHERE DATE(created_at) = ? GROUP BY topic', [date], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ topics: results });
  });
});

// API: Get word frequency for all time (overall)
app.get('/api/wordfreq/overall', (req, res) => {
  db.query('SELECT message FROM confessions', [], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const allText = results.map(r => r.message).join(' ');
    const { extractWordFrequency } = require('./nlp');
    const list = extractWordFrequency(allText, 50);
    res.json({ list });
  });
});

// API: Get word frequency for a specific year
app.get('/api/wordfreq/year/:year', (req, res) => {
  const { year } = req.params;
  db.query('SELECT message FROM confessions WHERE YEAR(created_at) = ?', [year], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const allText = results.map(r => r.message).join(' ');
    const { extractWordFrequency } = require('./nlp');
    const list = extractWordFrequency(allText, 50);
    res.json({ list });
  });
});

// API: Get word frequency for a specific month (format: /month/:year/:month)
app.get('/api/wordfreq/month/:year/:month', (req, res) => {
  const { year, month } = req.params;
  db.query('SELECT message FROM confessions WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?', [year, month], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const allText = results.map(r => r.message).join(' ');
    const { extractWordFrequency } = require('./nlp');
    const list = extractWordFrequency(allText, 50);
    res.json({ list });
  });
});

// API: Get word frequency for a specific week (year + ISO week number)
app.get('/api/wordfreq/week/:year/:week', (req, res) => {
  const { year, week } = req.params;
  db.query('SELECT message FROM confessions WHERE YEAR(created_at) = ? AND WEEK(created_at,1) = ?', [year, week], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const allText = results.map(r => r.message).join(' ');
    const { extractWordFrequency } = require('./nlp');
    const list = extractWordFrequency(allText, 50);
    res.json({ list });
  });
});

// API: Get word frequency for a specific day of week (format: /day/:day, where day=0-6)
app.get('/api/wordfreq/day/:day', (req, res) => {
  const { day } = req.params;
  db.query('SELECT message FROM confessions WHERE DAYOFWEEK(created_at) = ?', [day], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const allText = results.map(r => r.message).join(' ');
    const { extractWordFrequency } = require('./nlp');
    const list = extractWordFrequency(allText, 50);
    res.json({ list });
  });
});

// API: Get word frequency for a given day (for word cloud)
app.get('/api/wordfreq', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Missing date' });

  db.query(
    'SELECT message FROM confessions WHERE DATE(created_at) = ?',
    [date],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      const allText = results.map(r => r.message).join(' ');
      const { extractWordFrequency } = require('./nlp');
      const list = extractWordFrequency(allText, 50); // top 50 words
      res.json({ list });
    }
  );
});

// API: Analytics summary for a given range (overall/year/month/day/date)
// Returns a textual summary including: top topic, dominant sentiment, peak hour(s), and top problems (from wordfreq)
// Refactor analytics summary handler into a shared function and register multiple paths
async function analyticsSummaryHandler(req, res) {
  try {
    const { range, year, month, day, date } = req.query;
    // Build WHERE clause and params based on range
    let where = '';
    const params = [];
    if (range === 'year' && year) {
      where = 'WHERE YEAR(created_at) = ?'; params.push(year);
    } else if (range === 'month' && year && month) {
      where = 'WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?'; params.push(year, month);
    } else if (range === 'day' && day) {
      // day expected as 1-7 (Sunday=1)
      where = 'WHERE DAYOFWEEK(created_at) = ?'; params.push(day);
    } else if (range === 'date' && date) {
      where = 'WHERE DATE(created_at) = ?'; params.push(date);
    } else if (range === 'overall') {
      where = '';
    } else {
      return res.status(400).json({ error: 'Invalid or missing range parameters' });
    }

  // 1) Total count
  const totalSql = `SELECT COUNT(*) as total FROM confessions ${where}`;
    
    
    const topicSql = `SELECT topic, COUNT(*) as cnt FROM confessions ${where} GROUP BY topic ORDER BY cnt DESC LIMIT 3`;
    const topicRes = await new Promise((resolve, reject) => db.query(topicSql, params, (e, r) => e ? reject(e) : resolve(r)));
    const topTopics = (topicRes || []).map(r => ({ topic: r.topic, count: r.cnt, pct: Math.round((r.cnt / total) * 100) }));

    // 3) Sentiment breakdown
    const sentSql = `SELECT sentiment, COUNT(*) as cnt FROM confessions ${where} GROUP BY sentiment`;
    const sentRes = await new Promise((resolve, reject) => db.query(sentSql, params, (e, r) => e ? reject(e) : resolve(r)));
    const sentiments = (sentRes || []).map(r => ({ sentiment: r.sentiment, count: r.cnt, pct: Math.round((r.cnt / total) * 100) }));
    // pick top sentiment
    const topSentiment = sentiments.reduce((a, b) => (a.count > b.count ? a : b), sentiments[0]);

    // 4) Peak hours (top 3 hours)
    const hourSql = `SELECT HOUR(created_at) as hr, COUNT(*) as cnt FROM confessions ${where} GROUP BY hr ORDER BY cnt DESC LIMIT 3`;
    const hourRes = await new Promise((resolve, reject) => db.query(hourSql, params, (e, r) => e ? reject(e) : resolve(r)));
    const peakHours = (hourRes || []).map(r => ({ hour: r.hr, count: r.cnt, pct: Math.round((r.cnt / total) * 100) }));

    // 5) Top keywords from messages (use up to 2000 rows to improve keyword coverage)
    const msgSql = `SELECT message FROM confessions ${where} LIMIT 2000`;
    const msgRes = await new Promise((resolve, reject) => db.query(msgSql, params, (e, r) => e ? reject(e) : resolve(r)));
    const allText = (msgRes || []).map(x => x.message).join(' ');
    const { extractWordFrequency } = require('./nlp');
    const topWords = allText ? extractWordFrequency(allText, 12) : [];
    const topKeywords = topWords.slice(0, 8).map(w => ({ word: w[0], count: w[1] }));

    // Compose improved human-friendly paragraph
    let parts = [];
    parts.push(`Total confessions in range: ${total}.`);
    if (topTopics.length > 0) {
      const topicsText = topTopics.map(t => `${t.topic} (${t.count}, ${t.pct}%)`).join('; ');
      parts.push(`Top topics: ${topicsText}.`);
    }
    if (sentiments.length > 0) {
      const sentText = sentiments.map(s => `${s.sentiment} ${s.pct}% (${s.count})`).join(', ');
      parts.push(`Sentiment breakdown: ${sentText}.`);
      if (topSentiment) parts.push(`Overall sentiment leans ${topSentiment.sentiment}.`);
    }
    if (peakHours.length > 0) {
      const hrsText = peakHours.map(h => `${h.hour}:00 (${h.pct}%)`).join(', ');
      parts.push(`Peak submission hours: ${hrsText}.`);
    }
    if (topKeywords.length > 0) {
      const kwText = topKeywords.map(k => `${k.word} (${k.count})`).join(', ');
      parts.push(`Common keywords: ${kwText}.`);
    }

    const summaryText = parts.join(' ');
    res.json({ summary: summaryText, details: { total, topTopics, sentiments, peakHours, topKeywords } });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: 'Failed to generate analytics summary' });
  }
}

// Register handler under multiple routes (aliasing)
app.get('/api/analytics-summary', analyticsSummaryHandler);
app.get('/api/analytics/summary', analyticsSummaryHandler);
app.get('/api/summary', analyticsSummaryHandler);

// POST /api/generate-summary
// Body: { range: 'overall'|'year'|'month'|'week'|'day'|'date', year?, month?, week?, day?, date? }
// Returns: { summary: string, details: { total, topTopics, sentiments, peakHours, topKeywords } }

// ...existing code...
// Admin API: List/search confessions
app.get('/admin/confessions', (req, res) => {
  // Support filtering by free-text `q` or structured filters: sentiment, topic, date
  const { q, sentiment, topic, date } = req.query;
  let sql = 'SELECT * FROM confessions';
  const clauses = [];
  const params = [];

  if (q && q.toString().trim()) {
    clauses.push('(message LIKE ? OR summary LIKE ? OR topic LIKE ? OR sentiment LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  if (sentiment && sentiment.toString().trim()) {
    // Exact match for sentiment (positive/neutral/negative)
    clauses.push('sentiment = ?');
    params.push(sentiment);
  }

  if (topic && topic.toString().trim()) {
    // Allow partial matching for topic
    clauses.push('topic LIKE ?');
    params.push(`%${topic}%`);
  }

  if (date && date.toString().trim()) {
    // Expecting YYYY-MM-DD format; compare DATE(created_at)
    clauses.push('DATE(created_at) = ?');
    params.push(date);
  }

  if (clauses.length > 0) {
    sql += ' WHERE ' + clauses.join(' AND ');
  }

  // Optional sort parameter (safe whitelist)
  const sort = (req.query.sort || '').toString();
  let orderClause = ' ORDER BY created_at DESC';
  if (sort === 'sentimentScore_asc') orderClause = ' ORDER BY sentimentScore ASC, created_at DESC';
  else if (sort === 'sentimentScore_desc') orderClause = ' ORDER BY sentimentScore DESC, created_at DESC';

  sql += orderClause;
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to fetch confessions:', err);
      return res.status(500).json({ error: 'Failed to fetch confessions' });
    }
    res.json(results);
  });
});

// Admin API: Delete confession by id
app.delete('/admin/confessions/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM confessions WHERE id = ?', [id], function (err, result) {
    if (err) {
      console.error('Failed to delete confession:', err);
      return res.status(500).json({ error: 'Failed to delete confession' });
    }
    res.json({ success: true, deleted: result.affectedRows });
  });
});

// Prepare transporter variable. We'll initialize it on startup with initTransporter().
let transporter = null;

// Initialize SMTP transporter with provided credentials, otherwise create an Ethereal test account for dev
async function initTransporter() {
  // If user provided SMTP creds, try to verify them first
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const t = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await t.verify();
      transporter = t;
      console.log('SMTP transporter verified using provided credentials.');
      return;
    } catch (e) {
      console.warn('Provided SMTP credentials failed to verify:', e && e.message ? e.message : e);
      // fall through to Ethereal creation
    }
  }

  // Create Ethereal account for development/testing so missing or invalid SMTP doesn't stop the app
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  console.log('Using Ethereal test account for email (development only).');
  } catch (e) {
    console.error('Failed to create Ethereal test account:', e);
    // Leave transporter null; callers will see errors when attempting to send
  }
}

// API to send confession


app.post("/send", async (req, res) => {
  const { message, userEmail } = req.body;
  const isCopyOnly = !!userEmail && req.body.copyOnly === true;

  // Basic guard: require message text
  if (!message || !message.toString().trim()) {
    return res.status(400).send({ message: "Message is required" });
  }

  // Handle copy-only requests (avoid double inserts)
  if (isCopyOnly) {
    try {
      const earlySolutionFallback = "We're sorry — we couldn't generate suggestions at this time.";
      const sendCopy = (earlySolution) => {
        const safeEarlySolution = earlySolution || earlySolutionFallback;
        const userMailText = `${message}\n\n---\nEarly suggestions (quick):\n${safeEarlySolution}\n---\n`;
        const userMailOptions = {
          from: '"Sintok Echoes" <sintokechoes@gmail.com>',
          to: userEmail,
          subject: "Your Confession Copy - Sintok's Echoes",
          text: userMailText
        };
        transporter.sendMail(userMailOptions, (userError, userInfo) => {
          if (userError) {
            console.error('Failed to send copy to user (copyOnly):', userError);
            return res.send({ message: "Failed to send a copy to your email.", emailError: userError && userError.message ? userError.message : String(userError) });
          }
          res.send({ message: "A copy of your confession was sent to your email.", earlySolution: safeEarlySolution });
        });
      };

      if (!ENABLE_USER_SUGGESTIONS) {
        return sendCopy(earlySolutionFallback);
      }

      try {
        const earlySolution = await generateEarlySolution(message, '');
        return sendCopy(earlySolution || earlySolutionFallback);
      } catch (e) {
        console.error('Failed to generate early solution (copyOnly):', e);
        return sendCopy(earlySolutionFallback);
      }
    } catch (e) {
      console.error('Unexpected error handling copyOnly request:', e);
      return res.status(500).send({ message: 'Failed to process copy-only request.' });
    }
  }

  // ---------------------------------------------------------------------------
  // NOTE: copy-only requests are now handled by a dedicated endpoint (/send-copy)
  // The branch above is kept for backward compatibility but should no longer be used
  // by the client. New client requests should POST to /send-copy instead.
  // ---------------------------------------------------------------------------

  // Lightweight language detection (fallback) — prefers Malay when common Malay words appear
  function detectLanguage(text) {
    if (!text) return 'en';
    const sample = (text || '').toString().toLowerCase();
    const msWords = ['dan','yang','untuk','dengan','tidak','saya','kami','kamu','adalah','ini','itu','kepada','kerana','boleh','lagi','sangat'];
    const tokens = sample.split(/[^a-z\u00C0-\u024F0-9]+/).filter(Boolean);
    if (tokens.length === 0) return 'en';
    let msCount = 0;
    for (const t of tokens) if (msWords.includes(t)) msCount++;
    // If Malay tokens make up >=2% of tokens or at least 2 hits, treat as Malay
    if (msCount >= 2 || msCount / tokens.length >= 0.02) return 'ms';
    return 'en';
  }

  // Determine language: client may supply `lang` in body; otherwise detect
  const lang = req.body.lang || detectLanguage(message);

  // Analyze sentiment (routes to HF for Malay when lang==='ms')
  const nlpResult = await analyzeSentiment(message, { lang });

  let sentimentLabel = "unknown";
  let sentimentScore = null;
  if (Array.isArray(nlpResult) && nlpResult.length > 0 && nlpResult[0].label) {
    const labelRaw = nlpResult[0].label;
    sentimentScore = nlpResult[0].score;
    if (labelRaw.toLowerCase().includes("pos")) sentimentLabel = "positive";
    else if (labelRaw.toLowerCase().includes("neg")) sentimentLabel = "negative";
    else sentimentLabel = "neutral";
  } else if (nlpResult && nlpResult[0] && nlpResult[0].error) {
    // If Groq/LLM is unavailable, fall back to a lightweight heuristic to keep the server usable in dev
    if (!process.env.GROQ_API_KEY) {
      const txt = (message || '').toLowerCase();
      const posWords = ['good','happy','joy','relieved','grateful','safe','ok','okay','fine'];
      const negWords = ['sad','depress','suicid','angry','hate','worri','anxious','lonely','stress','stressed'];
      let pos = 0, neg = 0;
      txt.split(/[^a-z0-9]+/).forEach(w => {
        if (!w) return;
        if (posWords.includes(w)) pos++;
        if (negWords.includes(w)) neg++;
      });
      if (pos > neg) { sentimentLabel = 'positive'; sentimentScore = 0.6; }
      else if (neg > pos) { sentimentLabel = 'negative'; sentimentScore = 0.6; }
      else { sentimentLabel = 'neutral'; sentimentScore = 0.5; }
      console.warn('Groq unavailable — used simple heuristic for sentiment.');
    } else {
      return res.status(500).send({ message: `Sentiment analysis failed: ${nlpResult[0].error}` });
    }
  }

  // Classify topic (GroqCloud zero-shot returns {labels, scores} or error object)
  const topicResult = await classifyTopicZeroShot(message, { lang });
  // Topic -> department mapping (corrected):
  //  - academic/education/study -> Hal Ehwal Akademik (HEA) -> haikaljohari4747@gmail.com
  //  - mental/mental health     -> Hal Ehwal Pelajar (HEP)   -> haidilah@gmail.com
  let recipientEmail = "haikaljohari4747@gmail.com"; // default: HEA (academic/education)
  let topicLabel = "academic";
  if (topicResult && Array.isArray(topicResult.labels) && topicResult.labels.length > 0) {
    // Pick the label with the highest score (first label is highest)
    topicLabel = topicResult.labels[0];
    const tl = (topicLabel || '').toString().toLowerCase();
    // map education-related labels to HEA
    if (tl.includes('academic') || tl.includes('akadem') || tl.includes('education') || tl.includes('study') || tl.includes('exam') || tl.includes('assignment')) {
      recipientEmail = "haikaljohari4747@gmail.com"; // HEA (academic/education) department email
    } else if (tl.includes('mental') || tl.includes('mental health') || tl.includes('mental-health') || tl.includes('stress') || tl.includes('anxious')) {
      recipientEmail = "haidilah@gmail.com"; // HEP (student/mental health) department email
    }
  } else if (topicResult && topicResult.error) {
    return res.status(500).send({ message: `Topic classification failed: ${topicResult.error}` });
  }

  // Generate summary (handle error object)
  let summaryText = "";
  try {
    const summaryResult = await summarizeText(message);
    if (Array.isArray(summaryResult) && summaryResult.length > 0 && summaryResult[0].summary_text) {
      summaryText = summaryResult[0].summary_text;
    } else if (summaryResult && summaryResult.error) {
      return res.status(500).send({ message: `Summarization failed: ${summaryResult.error}` });
    }
  } catch (e) {
    console.error("Summarization error:", e);
    return res.status(500).send({ message: "Summarization failed: Unexpected error." });
  }

  let mailText = `${message}\n`;
  if (summaryText) {
    mailText += `\n---\nSummary:\n${summaryText}\n---\n`;
  }
  mailText += `\nSentiment: ${sentimentLabel} (score: ${sentimentScore})\nTopic: ${topicLabel}`;

  const mailOptions = {
    from: '"Sintok Echoes" <sintokechoes@gmail.com>',
    to: recipientEmail,
    subject: "New Anonymous Confession",
    text: mailText
  };

  // Save confession to database (include recipient email for downstream analytics)
  db.query(
    `INSERT INTO confessions (message, sentiment, sentimentScore, topic, summary, recipient, lang) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      message,
      sentimentLabel,
      sentimentScore,
      topicLabel,
      summaryText,
      recipientEmail,
      lang
    ],
    function (dbErr, result) {
      if (dbErr) {
        console.error('Failed to save confession to DB:', dbErr);
        return res.status(500).send("Failed to save confession to DB");
      }
      transporter.sendMail(mailOptions, (error, info) => {
        // Helper to obtain Ethereal preview URL when available
        const previewUrl = info && typeof nodemailer.getTestMessageUrl === 'function' ? nodemailer.getTestMessageUrl(info) : null;

        if (error) {
          // Log concise error details
          console.error('Failed to send department notification email:', error && error.message);
          if (error && error.code) console.error('  code:', error.code);
          if (error && error.response) console.error('  response:', error.response);

          return res.send({
            message: "Confession saved, but failed to send department notification email.",
            nlp: nlpResult,
            summary: summaryText,
            emailError: error && error.message ? error.message : String(error)
          });
        }

        // Success — log info and preview link for Ethereal
  console.log('Department notification sent. info:', info && info.messageId ? info.messageId : info);
        // If userEmail is provided, send a copy to the user containing only their confession and an early solution
        if (userEmail && userEmail.includes('@')) {
          if (!ENABLE_USER_SUGGESTIONS) {
            // Send the confession text plus a safe fallback early-suggestion block (no external AI call)
            const earlySolutionFallback = "We're sorry — we couldn't generate suggestions at this time.";
            const userMailText = `${message}\n\n---\nEarly suggestions (quick):\n${earlySolutionFallback}\n---\n`;
            const userMailOptions = {
              from: '"Sintok Echoes" <sintokechoes@gmail.com>',
              to: userEmail,
              subject: "Your Confession Copy - Sintok's Echoes",
              text: userMailText
            };
            transporter.sendMail(userMailOptions, (userError, userInfo) => {
              if (userError) {
                console.error('Failed to send copy to user:', userError && userError.message);
                if (userError && userError.code) console.error('  code:', userError.code);
                if (userError && userError.response) console.error('  response:', userError.response);
                return res.send({
                  message: "Confession sent, but failed to send copy to your email.",
                  nlp: nlpResult,
                  summary: summaryText,
                  earlySolution: earlySolutionFallback
                });
              }
              console.log('Copy sent to user. info:', userInfo && userInfo.messageId ? userInfo.messageId : userInfo);
              res.send({
                message: "Confession sent successfully! A copy was sent to your email.",
                nlp: nlpResult,
                summary: summaryText,
                earlySolution: earlySolutionFallback
              });
            });
          } else {
            // generate an early solution based on the confession and topicLabel BEFORE sending email
            generateEarlySolution(message, topicLabel).then(earlySolution => {
              if (!earlySolution) earlySolution = "We're sorry — we couldn't generate suggestions at this time.";
              const userMailText = `${message}\n\n---\nEarly suggestions (quick):\n${earlySolution}\n---\n`;
              const userMailOptions = {
                from: '"Sintok Echoes" <sintokechoes@gmail.com>',
                to: userEmail,
                subject: "Your Confession Copy - Sintok's Echoes",
                text: userMailText
              };
              transporter.sendMail(userMailOptions, (userError, userInfo) => {
                if (userError) {
                  console.error('Failed to send copy to user:', userError);
                  return res.send({
                    message: "Confession sent, but failed to send copy to your email.",
                    nlp: nlpResult,
                    summary: summaryText,
                    earlySolution
                  });
                }
                res.send({
                  message: "Confession sent successfully! A copy was sent to your email.",
                  nlp: nlpResult,
                  summary: summaryText,
                  earlySolution
                });
              });
            }).catch(e => {
              console.error('Failed to generate early solution:', e);
              const earlySolution = "We're sorry — we couldn't generate suggestions at this time.";
              const userMailText = `${message}\n\n---\nEarly suggestions (quick):\n${earlySolution}\n---\n`;
              const userMailOptions = {
                from: '"Sintok Echoes" <sintokechoes@gmail.com>',
                to: userEmail,
                subject: "Your Confession Copy - Sintok's Echoes",
                text: userMailText
              };
              transporter.sendMail(userMailOptions, (userError, userInfo) => {
                if (userError) {
                  console.error('Failed to send copy to user:', userError);
                  return res.send({
                    message: "Confession sent, but failed to send copy to your email.",
                    nlp: nlpResult,
                    summary: summaryText,
                    earlySolution
                  });
                }
                res.send({
                  message: "Confession sent successfully! A copy was sent to your email.",
                  nlp: nlpResult,
                  summary: summaryText,
                  earlySolution
                });
              });
            });
          }
        } else {
          res.send({
            message: "Confession sent successfully!",
            nlp: nlpResult,
            summary: summaryText
          });
        }
      });
    }
  );
});

// New endpoint: send a copy to user without inserting a new confession row
// Body: { message: string, userEmail: string, lang?: string }
app.post('/send-copy', async (req, res) => {
  try {
    const { message, userEmail } = req.body;
    const lang = req.body.lang || 'ms';

    if (!message || !message.toString().trim()) {
      return res.status(400).send({ message: 'Message is required' });
    }
    if (!userEmail || !userEmail.includes('@')) {
      return res.status(400).send({ message: 'A valid email is required to send a copy.' });
    }

    const earlySolutionFallback = "We're sorry — we couldn't generate suggestions at this time.";

    const sendCopy = (earlySolutionText) => {
      const safeEarly = earlySolutionText || earlySolutionFallback;
      const userMailText = `${message}\n\n---\nEarly suggestions (quick):\n${safeEarly}\n---\n`;
      const userMailOptions = {
        from: '"Sintok Echoes" <sintokechoes@gmail.com>',
        to: userEmail,
        subject: "Your Confession Copy - Sintok's Echoes",
        text: userMailText
      };
      transporter.sendMail(userMailOptions, (userError, userInfo) => {
        if (userError) {
          console.error('Failed to send copy to user (/send-copy):', userError);
          return res.send({ message: 'Failed to send a copy to your email.', emailError: userError && userError.message ? userError.message : String(userError) });
        }
        res.send({ message: 'A copy of your confession was sent to your email.', earlySolution: safeEarly });
      });
    };

    if (!ENABLE_USER_SUGGESTIONS) {
      return sendCopy(earlySolutionFallback);
    }

    try {
      const earlySolution = await generateEarlySolution(message, '');
      return sendCopy(earlySolution || earlySolutionFallback);
    } catch (e) {
      console.error('Failed to generate early solution (/send-copy):', e);
      return sendCopy(earlySolutionFallback);
    }
  } catch (e) {
    console.error('Unexpected error in /send-copy:', e);
    return res.status(500).send({ message: 'Failed to process copy request.' });
  }
});

// Initialize transporter then start server
initTransporter().then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}).catch(err => {
  console.error('initTransporter failed:', err);
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port} (transporter init failed)`);
  });
});
