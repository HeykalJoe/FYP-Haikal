(async () => {
  try {
    const { analyzeSentiment, classifyTopicZeroShot, summarizeText, generateEarlySolution } = require('./nlp');
    const sample = "I'm nervous about exams and having trouble sleeping. I'm worried I'll fail despite studying.";

    console.log('1) analyzeSentiment...');
    try {
      const a = await analyzeSentiment(sample);
      console.log('analyzeSentiment ->', JSON.stringify(a, null, 2));
    } catch (e) { console.error('analyzeSentiment ERROR:', e && e.message ? e.message : e); }

    console.log('\n2) classifyTopicZeroShot...');
    try {
      const c = await classifyTopicZeroShot(sample);
      console.log('classifyTopicZeroShot ->', JSON.stringify(c, null, 2));
    } catch (e) { console.error('classifyTopicZeroShot ERROR:', e && e.message ? e.message : e); }

    console.log('\n3) summarizeText...');
    try {
      const s = await summarizeText(sample);
      console.log('summarizeText ->', JSON.stringify(s, null, 2));
    } catch (e) { console.error('summarizeText ERROR:', e && e.message ? e.message : e); }

    console.log('\n4) generateEarlySolution...');
    try {
      const g = await generateEarlySolution(sample, 'academic');
      console.log('generateEarlySolution ->', g);
    } catch (e) { console.error('generateEarlySolution ERROR:', e && e.message ? e.message : e); }

    process.exit(0);
  } catch (err) {
    console.error('Test script failure:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
