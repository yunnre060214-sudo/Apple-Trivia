export const VERSION = '3.6.0';
export const CATEGORIES = {
  iphone: { name: 'iPhone', short: 'iP', color: '#3478e7' },
  ipad: { name: 'iPad', short: 'iD', color: '#8958c7' },
  mac: { name: 'Mac', short: 'Mc', color: '#b27637' },
  silicon: { name: 'Apple 芯片', short: 'Si', color: '#4d7580' },
  watch: { name: 'Apple Watch', short: 'Aw', color: '#ba5666' },
  audio: { name: '音频与家居', short: 'Au', color: '#587a49' },
  ecosystem: { name: '系统与生态', short: 'OS', color: '#6072a1' },
  history: { name: '产品历史', short: 'Hi', color: '#96634e' },
};
export const LEVELS = {
  easy: { name: '入门', label: '认识产品与功能', weight: 1 },
  medium: { name: '进阶', label: '熟悉型号与代际', weight: 2 },
  hard: { name: '困难', label: '理解规格与兼容', weight: 3 },
  expert: { name: '专家', label: '比较、推理与应用', weight: 4 },
};
export function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
export function seeded(seed) {
  let value = typeof seed === 'number' ? seed : hash(String(seed));
  return () => {
    value += 0x6d2b79f5;
    let n = value;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
export function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function filterBank(bank, { categories = Object.keys(CATEGORIES), difficulty = 'mixed', ids, topic, casual = false } = {}) {
  const allowed = new Set(categories);
  const allowedIds = ids ? new Set(ids) : null;
  return bank.filter(q => allowed.has(q.category) && (difficulty === 'mixed' || q.difficulty === difficulty) && (!allowedIds || allowedIds.has(q.id)) && (!topic || (topic === 'timeline' ? q.kind === 'timeline' : q.topic === topic)) && (!casual || q.kind || (!/^(spec|ratio|compare)-/.test(q.id) && ['easy','medium'].includes(q.difficulty))));
}
// Round-robin across shuffled category/level buckets gives small topics a fair place in a paper.
export function drawQuestions(bank, config, seed, seen = []) {
  const rng = seeded(seed);
  const pool = filterBank(bank, config);
  const wanted = Math.min(pool.length, Math.max(1, Math.floor(config.count || 20)));
  const recent = new Set(seen);
  const positions = new Map(seen.map((id, i) => [id, i]));
  // Quick rounds have their own topic/family policy. Skip the unused balanced
  // shuffle and its allocations for the most common five-question entry point.
  if (config.mode === 'quick') return quickDraw(pool, wanted, rng, recent, positions).map(q => ({...q, options:shuffle(q.options,rng)}));
  const takeBalanced = (items, limit) => {
    const groups = new Map();
    for (const q of shuffle(items, rng)) {
      const key = `${q.category}:${q.difficulty}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(q);
    }
    const buckets = shuffle([...groups.values()], rng);
    const picked = [];
    while (picked.length < limit && buckets.some(b => b.length)) {
      for (const bucket of buckets) if (bucket.length && picked.length < limit) picked.push(bucket.pop());
    }
    return picked;
  };
  const fresh = takeBalanced(pool.filter(q => !recent.has(q.id)), wanted);
  const old = pool.filter(q => recent.has(q.id)).sort((a,b) => positions.get(a.id)-positions.get(b.id)).slice(0,wanted-fresh.length);
  const selected = shuffle([...fresh, ...old], rng);
  return selected.map(q => ({ ...q, options: shuffle(q.options, rng) }));
}
export function createSession(questions, config, seed, now = Date.now()) {
  const seconds = config.mode === 'exam' ? Number(config.secondsPerQuestion || 0) : 0;
  return {
    schema: 1, version: VERSION, id: `${now}-${seed}`, seed, config,
    questions: questions.map(q => ({ id: q.id, options: q.options })),
    answers: {}, confirmed: [], flags: [], index: 0, startedAt: now,
    deadline: seconds > 0 ? now + questions.length * seconds * 1000 : null,
  };
}
export function hydrateSession(saved, bank) {
  if (!saved || saved.schema !== 1 || !['1.0.0', '1.0.1', '2.0.0', '2.0.1', '2.0.2', '2.0.3', '2.0.4', '2.1.0', '2.2.0', '2.2.1', '2.2.2', '2.2.3', '3.0.0', '3.0.1', '3.0.2', '3.1.0', '3.2.0', '3.3.0', '3.3.1', '3.4.0', '3.4.1', '3.4.2', '3.4.3', VERSION].includes(saved.version) || !Array.isArray(saved.questions) || !saved.questions.length || saved.questions.length > Math.min(500,bank.length) || !Number.isFinite(saved.startedAt) || saved.startedAt < 0) return null;
  if (!saved.config || !['quick', 'exam', 'practice'].includes(saved.config.mode)) return null;
  const lookup = new Map(bank.map(q => [q.id, q]));
  const ids = new Set();
  const questions = [];
  for (const row of saved.questions) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string') return null;
    const q = lookup.get(row.id);
    if (!q || ids.has(q.id) || !Array.isArray(row.options) || row.options.length !== q.options.length || new Set(row.options).size !== q.options.length || !row.options.every(o => q.options.includes(o))) return null;
    ids.add(q.id);
    questions.push({ ...q, options: row.options });
  }
  const answers = {};
  const storedAnswers = saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers) ? saved.answers : {};
  for (const q of questions) if (Object.hasOwn(storedAnswers,q.id) && q.options.includes(storedAnswers[q.id])) answers[q.id] = storedAnswers[q.id];
  const safeIds = a => Array.isArray(a) ? [...new Set(a)].filter(id => ids.has(id)) : [];
  return {
    ...saved, answers, confirmed: safeIds(saved.confirmed).filter(id => answers[id]),
    flags: safeIds(saved.flags), index: Math.max(0, Math.min(questions.length - 1, Math.floor(saved.index) || 0)),
    deadline: saved.config.mode === 'exam' && Number.isFinite(saved.deadline) && saved.deadline > saved.startedAt ? saved.deadline : null,
    hydratedQuestions: questions,
  };
}
export function grade(questions, answers, startedAt, endedAt) {
  let correct = 0, unanswered = 0, points = 0, possible = 0, streak = 0, bestStreak = 0;
  const categories = {};
  const levels = {};
  const rows = questions.map(q => {
    const answer = answers[q.id] || null;
    const isCorrect = answer === q.answer;
    const weight = LEVELS[q.difficulty].weight;
    const state = answer === null ? 'unanswered' : isCorrect ? 'correct' : 'wrong';
    possible += weight;
    if (isCorrect) { correct++; points += weight; streak++; } else { streak = 0; }
    if (answer === null) unanswered++;
    bestStreak = Math.max(bestStreak, streak);
    for (const [group, key] of [[categories, q.category], [levels, q.difficulty]]) {
      group[key] ||= { total: 0, correct: 0 };
      group[key].total++;
      group[key].correct += Number(isCorrect);
    }
    return { id: q.id, answer, state };
  });
  return {
    total: questions.length, correct, wrong: questions.length - correct - unanswered, unanswered,
    score: questions.length ? Math.round(correct / questions.length * 1000) / 10 : 0,
    weightedScore: possible ? Math.round(points / possible * 100) : 0,
    bestStreak, duration: Math.max(0, Math.floor((endedAt - startedAt) / 1000)),
    categories, levels, rows,
  };
}
export function updateWrongBook(existing, report) {
  const wrong = new Set(existing);
  for (const row of report.rows) {
    if (row.state === 'correct') wrong.delete(row.id);
    else wrong.add(row.id);
  }
  return [...wrong];
}
export function validateBank(bank) {
  const ids = new Set(), prompts = new Set();
  for (const q of bank) {
    if (!q.id || ids.has(q.id)) throw new Error(`Duplicate/missing ID: ${q.id}`);
    if (!q.prompt || prompts.has(q.prompt)) throw new Error(`Duplicate/missing prompt: ${q.prompt}`);
    if (!CATEGORIES[q.category] || !LEVELS[q.difficulty]) throw new Error(`Invalid taxonomy: ${q.id}`);
    if (q.options.length !== 4 || new Set(q.options).size !== 4 || !q.options.every(o => typeof o === 'string' && o.trim())) throw new Error(`Invalid options: ${q.id}`);
    if (!q.options.includes(q.answer) || !q.explanation?.trim()) throw new Error(`Missing answer/explanation: ${q.id}`);
    if (!q.sources?.length || !q.sources.every(u => /^https:\/\/(?:(?:[\w-]+\.)?apple\.com(?:\.cn)?|www\.macrumors\.com)\//.test(u))) throw new Error(`Missing cited source: ${q.id}`);
    ids.add(q.id); prompts.add(q.prompt);
  }
  return { total: bank.length, categories: Object.fromEntries(Object.keys(CATEGORIES).map(c => [c, bank.filter(q => q.category === c).length])), levels: Object.fromEntries(Object.keys(LEVELS).map(l => [l, bank.filter(q => q.difficulty === l).length])) };
}


// Oldest first, newest last. Visiting a question moves it to the tail.
export function updateRecent(existing, visited, limit = 3000) {
  if (limit <= 0) return [];
  const order = new Set();
  for (const id of [...(Array.isArray(existing) ? existing : []), ...visited]) {
    if (typeof id !== 'string') continue;
    order.delete(id); order.add(id);
  }
  return [...order].slice(-limit);
}
function quickDraw(pool, count, rng, recent, positions) {
  const fresh = shuffle(pool.filter(q => !recent.has(q.id)), rng);
  const old = pool.filter(q => recent.has(q.id)).sort((a,b) => positions.get(a.id)-positions.get(b.id));
  const picked = [], used = new Set(), families = new Set();
  const add = q => { picked.push(q); used.add(q.id); (q.families || [q.family || q.id]).forEach(f=>families.add(f)); };
  const clashes = q => (q.families || [q.family || q.id]).some(f => families.has(f));
  // Three story/surprise cards, one timeline duel and one wildcard per five.
  const pattern = ['trivia','trivia','timeline','trivia','classic'];
  for (let i=0; i<count; i++) {
    const available = fresh.filter(q=>!used.has(q.id));
    const kind = pattern[i % pattern.length];
    const q = available.find(q=>(q.kind || 'classic')===kind && !clashes(q)) || available.find(q=>!clashes(q)) || available[0] || old.find(q=>!used.has(q.id));
    if(q) add(q);
  }
  return shuffle(picked,rng);
}
export function resultTitle(report) {
  if (report.total > 0 && report.correct === report.total) return {title:'库克看了都点头',line:'这场发布会，下一句交给你。',badge:'满分隐藏款',tone:'gold'};
  if (report.score >= 80) return {title:'苹果店隐藏店员',line:'你一开口，Genius 都想听两句。',badge:'懂得有点多',tone:'violet'};
  if (report.score >= 60) return {title:'发布会前排常客',line:'One more thing，你已经猜到一半。',badge:'熟悉的感觉',tone:'blue'};
  if (report.score >= 40) return {title:'路过的果味侦探',line:'猜对靠知识，猜错收获新故事。',badge:'好奇心在线',tone:'mint'};
  if (report.score > 0) return {title:'Apple 官网待逛选手',line:'你可能需要逛逛 Apple 官网。',badge:'还有惊喜',tone:'coral'};
  return {title:'完美避开正确答案',line:'这种精准，也算一种天赋。',badge:'反向满分',tone:'coral'};
}
export function easterEggs(report) {
  const eggs=[];
  if (report.total>0 && report.correct===report.total) eggs.push('满分');
  if (report.bestStreak>=3) eggs.push(`${report.bestStreak} 连对`);
  if (report.total>=5 && report.unanswered===0 && report.duration<=report.total*3) eggs.push('闪电完成');
  return eggs;
}

