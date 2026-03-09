import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  dbInsertOrder, dbUpdateOrder, dbInsertVoiceEvent,
  dbInsertOverrideFlag, dbLoadOrders, dbSubscribeOrders
} from "./supabase.js";

/* ═══════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════ */
const C = {
  bg:        "#07090C",
  surface:   "#0D1117",
  card:      "#131920",
  cardHover: "#182028",
  border:    "#1E2830",
  borderHi:  "#2C3A46",
  red:       "#C0392B",
  orange:    "#E07B2A",
  orangeDim: "#8A4C1A",
  green:     "#16A34A",
  greenGlow: "#16A34A44",
  blue:      "#2563EB",
  amber:     "#D97706",
  purple:    "#7C3AED",
  cyan:      "#0891B2",
  text:      "#E2E8F0",
  textMid:   "#8899AA",
  textDim:   "#3D5066",
  danger:    "#DC2626",
  success:   "#15803D",
  warning:   "#B45309",
};

/* ═══════════════════════════════════════════════════════════════
   RESTAURANTS
═══════════════════════════════════════════════════════════════ */
const RESTAURANTS = [
  { id:"R001", name:"King St West",      city:"Toronto",      province:"ON", storeNum:"4821", timezone:"EST" },
  { id:"R002", name:"Yonge & Eglinton",  city:"Toronto",      province:"ON", storeNum:"3142", timezone:"EST" },
  { id:"R003", name:"Square One",        city:"Mississauga",  province:"ON", storeNum:"5601", timezone:"EST" },
  { id:"R004", name:"Rideau Centre",     city:"Ottawa",       province:"ON", storeNum:"2290", timezone:"EST" },
  { id:"R005", name:"Chinook Centre",    city:"Calgary",      province:"AB", storeNum:"7714", timezone:"MST" },
];

/* ═══════════════════════════════════════════════════════════════
   MENU
═══════════════════════════════════════════════════════════════ */
const MENU = [
  { id:"hashbrowns",   name:"Hashbrowns",          cat:"Food",  aliases:["hash","browns","hash brown","potato"] },
  { id:"timbits",      name:"Timbits",              cat:"Food",  aliases:["timbit","donut holes","holes"] },
  { id:"coffee",       name:"Coffee",               cat:"Drink", aliases:["regular","double double","black coffee","dark roast"] },
  { id:"bagel",        name:"Bagel",                cat:"Food",  aliases:["bagels","everything bagel","sesame"] },
  { id:"muffin",       name:"Muffin",               cat:"Food",  aliases:["muffins","bran","blueberry"] },
  { id:"donut",        name:"Donut",                cat:"Food",  aliases:["donuts","doughnut","glazed","honey cruller","cruller"] },
  { id:"wrap",         name:"Breakfast Wrap",       cat:"Food",  aliases:["wraps","grilled wrap","burrito"] },
  { id:"soup",         name:"Soup",                 cat:"Food",  aliases:["chili","broccoli cheddar","chicken noodle"] },
  { id:"sandwich",     name:"Sandwich",             cat:"Food",  aliases:["sandwiches","panini","sub"] },
  { id:"hotchoc",      name:"Hot Chocolate",        cat:"Drink", aliases:["hot choc","chocolate","cocoa"] },
  { id:"croissant",    name:"Croissant",            cat:"Food",  aliases:["croissants","pastry","flaky"] },
  { id:"icedcapp",     name:"Iced Capp",            cat:"Drink", aliases:["iced cap","icecap","iced coffee","frozen coffee"] },
  { id:"bfastsand",    name:"Breakfast Sandwich",   cat:"Food",  aliases:["egg sandwich","biscuit","BELT","belt","bfast sandwich"] },
  { id:"steepedtea",   name:"Steeped Tea",          cat:"Drink", aliases:["tea","steep","steeped","orange pekoe"] },
  { id:"frenchvan",    name:"French Vanilla",       cat:"Drink", aliases:["vanilla","french van","fv"] },
  { id:"cookie",       name:"Cookie",               cat:"Food",  aliases:["cookies","chocolate chip","oatmeal raisin"] },
];

/* ═══════════════════════════════════════════════════════════════
   STAFF  (per restaurant)
═══════════════════════════════════════════════════════════════ */
const STAFF_DB = {
  R001: [
    { id:"S001", name:"Marcus T.",   role:"Cashier",   color:"#2563EB", initials:"MT" },
    { id:"S002", name:"Priya K.",    role:"Supervisor", color:"#7C3AED", initials:"PK" },
    { id:"S003", name:"James R.",    role:"Kitchen",   color:"#16A34A", initials:"JR" },
    { id:"S004", name:"Aisha M.",    role:"Drive-Thru", color:"#D97706", initials:"AM" },
    { id:"S005", name:"Devon C.",    role:"Float",     color:"#DC2626", initials:"DC" },
  ],
  R002: [
    { id:"S010", name:"Olivia N.",   role:"Supervisor", color:"#7C3AED", initials:"ON" },
    { id:"S011", name:"Ryan P.",     role:"Cashier",   color:"#2563EB", initials:"RP" },
    { id:"S012", name:"Sara L.",     role:"Kitchen",   color:"#16A34A", initials:"SL" },
  ],
  R003: [
    { id:"S020", name:"Nathan K.",   role:"Supervisor", color:"#0891B2", initials:"NK" },
    { id:"S021", name:"Mia F.",      role:"Cashier",   color:"#D97706", initials:"MF" },
    { id:"S022", name:"Kevin D.",    role:"Kitchen",   color:"#16A34A", initials:"KD" },
  ],
  R004: [
    { id:"S030", name:"Sophie R.",   role:"Supervisor", color:"#7C3AED", initials:"SR" },
    { id:"S031", name:"Ben H.",      role:"Cashier",   color:"#2563EB", initials:"BH" },
  ],
  R005: [
    { id:"S040", name:"Chris W.",    role:"Supervisor", color:"#D97706", initials:"CW" },
    { id:"S041", name:"Emma T.",     role:"Cashier",   color:"#DC2626", initials:"ET" },
    { id:"S042", name:"Liam J.",     role:"Kitchen",   color:"#16A34A", initials:"LJ" },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   NLP ENGINE v3 — PRECISION-FIRST PARSER
   Only matches when score >= 0.65. Returns itemNotFound flag
   so caller can reject and speak "not in store directory".
═══════════════════════════════════════════════════════════════ */

const INTENT_PATTERNS = {
  CLOSE:      /(close|closed|closing|complete|completed|completing|finish|finished|done with|mark done|fulfill|fulfilled|fulfil|done order|close order|order done|order complete|order finished|order closed|mark order)/i,
  ORDER:      /(order|ordering|i need|we need|i want|we want|give me|can i get|could i get|i.ll have|put in|ring up|get me|send me|bring me|place|requesting)/i,
  MAKING:     /(making|now making|we.re making|i.m making|preparing|cooking|firing|dropping|starting a batch|putting on|starting to make)/i,
  WASTE:      /(waste|wasted|threw out|throwing out|toss|tossed|dump|dumped|gone bad|expired|spoiled|bad batch|unusable|ruined)/i,
  DISCARDING: /(discard|discarding|discarded|remove|removed|pulling|pulled|shelf pull|writing off|disposal)/i,
  PREPARED:   /(prepared|ready|order ready|is ready|are ready|all set|good to go|done|finished|fulfilled|coming up|completed)/i,
};
const INTENT_PRIORITY = ["CLOSE","PREPARED","WASTE","DISCARDING","MAKING","ORDER"];

const NUMBER_WORDS = {
  'zero':0,'one':1,'a':1,'an':1,'two':2,'three':3,'four':4,'five':5,
  'six':6,'seven':7,'eight':8,'nine':9,'ten':10,
  'eleven':11,'twelve':12,'thirteen':13,'fourteen':14,'fifteen':15,
  'sixteen':16,'seventeen':17,'eighteen':18,'nineteen':19,'twenty':20,
  'twenty one':21,'twenty-one':21,'twenty two':22,'twenty-two':22,
  'twenty three':23,'twenty-three':23,'twenty four':24,'twenty-four':24,
  'twenty five':25,'twenty-five':25,'thirty':30,'forty':40,'fifty':50,
  'sixty':60,'seventy':70,'eighty':80,'ninety':90,'hundred':100,
  'dozen':12,'half dozen':6,'couple':2,'few':3,'several':5,
};

function normalizeText(text) {
  return text.toLowerCase().trim()
    .replace(/hash\s+browns?/gi,         'hashbrowns')
    .replace(/tim\s+bits?/gi,            'timbits')
    .replace(/iced?\s+capp?s?/gi,        'iced capp')
    .replace(/french\s+vanilla/gi,       'french vanilla')
    .replace(/hot\s+choc(olate)?/gi,     'hot chocolate')
    .replace(/break\s*fast\s+wrap/gi,    'breakfast wrap')
    .replace(/break\s*fast\s+sand\w*/gi, 'breakfast sandwich')
    .replace(/steeped?\s+tea/gi,         'steeped tea')
    .replace(/\bkross?an?ts?\b/gi,       'croissant')
    .replace(/\bdough\s*nuts?\b/gi,      'donut')
    .replace(/\b(please|right now|asap|immediately|some|more|fresh|extra|additional|the|of|for|a batch|batch of)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ').trim();
}

/* ── Noise-adaptive pre-filter ───────────────────────────────
   Applied before NLP parsing. Strips artifacts that appear
   in speech-to-text output from noisy kitchen environments:
   hesitation sounds, repeated words, partial words, and
   common mis-transcriptions of kitchen background sounds.
────────────────────────────────────────────────────────────── */
function denoiseTranscript(text) {
  return text
    // Strip filler/hesitation words at start
    .replace(/^(um+|uh+|er+|ah+|oh+|hmm+|like|so|well|okay|ok|right|yeah|yes|no|hey)\s+/gi, '')
    // Strip repeated words (stutter or echo) e.g. "order order 6"
    .replace(/(\w+)\s+/gi, '$1')
    // Strip partial words at start (1-2 char fragments)
    .replace(/^\w{1,2}\s+/g, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1}, (_,i) =>
    Array.from({length:n+1}, (_,j) => i===0?j:j===0?i:0));
  for (let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function scoreItem(text, itemName, aliases) {
  const t = text.toLowerCase();
  const tWords = t.split(/\s+/).filter(w => w.length > 1);
  const allTerms = [itemName, ...aliases].map(s => s.toLowerCase());
  for (const term of allTerms) {
    if (t === term || t.includes(term)) return 1.0;
    const tw = term.split(/\s+/).filter(Boolean);
    if (tw.every(w => tWords.some(v => v === w || v.startsWith(w) || w.startsWith(v)))) return 0.92;
    const pLen = Math.max(5, Math.ceil(term.length * 0.75));
    if (term.length >= 5 && tWords.some(w => w.startsWith(term.slice(0,pLen)))) return 0.82;
    if (term.length >= 5 && tWords.some(w => term.startsWith(w) && w.length >= 5)) return 0.80;
    if (tw.length === 1 && term.length >= 6) {
      for (const w of tWords) {
        if (w.length < 5) continue;
        const dist = levenshtein(w, term);
        if (dist <= (term.length >= 9 ? 3 : 2)) return 0.70;
      }
    }
  }
  return 0;
}

function parseCommand(rawText) {
  const denoised = denoiseTranscript(rawText);
  const lower = normalizeText(denoised);
  let intent = null;
  for (const name of INTENT_PRIORITY) {
    if (INTENT_PATTERNS[name].test(lower)) { intent = name; break; }
  }
  let qty = 1;
  const digitMatch = lower.match(/\b(\d+)\b/);
  if (digitMatch) {
    qty = Math.min(999, parseInt(digitMatch[1], 10));
  } else {
    let bestLen = 0;
    for (const [word, num] of Object.entries(NUMBER_WORDS)) {
      const wLen = word.split(/\s+/).length;
      if (wLen >= bestLen && new RegExp('\\b' + word.replace(/-/g,'[- ]') + '\\b','i').test(lower)) {
        qty = num; bestLen = wLen;
      }
    }
  }
  let bestItem = null, bestScore = 0.65;
  for (const item of MENU) {
    const score = scoreItem(lower, item.name, item.aliases);
    if (score > bestScore) { bestScore = score; bestItem = item; }
  }
  const itemNotFound = !bestItem && intent !== null;
  const refMatch = lower.match(/th-[a-z0-9]+-\d{8}-\d{4}/i);
  const orderRef = refMatch ? refMatch[0].toUpperCase() : null;
  const confidence = Math.min((intent?0.5:0) + (bestItem?bestScore*0.5:0), 1.0);
  // ── Close order — extract the reference number ──
  let closeRef = null;
  if (intent === "CLOSE") {
    const closeMatch = lower.match(/(\d{1,3})/);
    if (closeMatch) closeRef = parseInt(closeMatch[1], 10);
  }

  // ── Confusion flags ──
  // qtyUnclear: digit was detected but very close to noise (e.g. "um 6" → ok, "uh" → unclear)
  // itemUnclear: partial match below strong threshold
  const qtyUnclear  = !digitMatch && qty === 1 && intent === "ORDER";
  const itemUnclear = bestItem && bestScore < 0.75 && bestScore >= 0.65;

  return {
    intent,
    item:       bestItem?.name || null,
    itemId:     bestItem?.id   || null,
    qty,
    orderRef,
    closeRef,           // for CLOSE commands
    confidence,
    itemNotFound,
    itemUnclear,        // match is weak — ask to confirm
    qtyUnclear,         // no number heard — ask to repeat
    raw:        rawText,
    normalized: lower,
  };
}

/* ═══════════════════════════════════════════════════════════════
   TTS ENGINE — VAPI-MATCHED VOICE
   Tuned to replicate VAPI agent voice character:
   - Google Neural voice (same engine VAPI uses for browser fallback)
   - Rate 0.92 — VAPI speaks slightly slower than default, deliberate
   - Pitch 1.0  — Neutral, professional, not robotic
   - Micro-pauses injected via comma tricks for natural cadence
   - Short phrases only — VAPI never speaks long sentences
═══════════════════════════════════════════════════════════════ */

const TTS = {
  _voice:   null,
  _ready:   false,
  _rate:    0.92,   // VAPI cadence — deliberate, clear
  _pitch:   1.0,    // neutral professional
  _volume:  1.0,

  // Voice priority list — mirrors what VAPI selects in browser environments
  VOICE_PRIORITY: [
    'Google US English',           // Chrome desktop — closest to VAPI
    'Google UK English Female',    // Chrome alt — warm, professional
    'Google UK English Male',
    'Samantha',                    // Safari/macOS — best native option
    'Karen',                       // macOS Australian — clear
    'Moira',                       // macOS Irish — natural
    'Microsoft Aria Online',       // Edge — neural, very natural
    'Microsoft Jenny Online',      // Edge — matches VAPI Rachel tone
    'Microsoft Guy Online',
  ],

  init() {
    if (!window.speechSynthesis) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      // Try priority list first (exact name match)
      for (const name of this.VOICE_PRIORITY) {
        const v = voices.find(v => v.name === name);
        if (v) { this._voice = v; this._ready = true; return; }
      }

      // Fallback: any non-local (neural) English voice
      const neural = voices.find(v =>
        v.lang.startsWith('en') && !v.localService
      );
      if (neural) { this._voice = neural; this._ready = true; return; }

      // Last resort: any English voice
      const eng = voices.find(v => v.lang.startsWith('en-US')) ||
                  voices.find(v => v.lang.startsWith('en')) ||
                  voices[0];
      this._voice = eng;
      this._ready = true;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  },

  // Inject natural micro-pauses — VAPI always pauses after the first word
  _addCadence(text) {
    return text
      // Pause after "Order logged." style openers
      .replace(/^(Order logged|Logged|Ready|Waste logged|Discard logged)\./i, '$1.,')
      // Pause before qty+item to let the item name land clearly
      .replace(/(\d+)\s+([A-Z])/g, '$1, $2')
      // Spell out numbers naturally (VAPI doesn't rush numbers)
      .replace(/(\d+)/g, (_, n) => {
        const words = ['zero','one','two','three','four','five','six','seven',
          'eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen',
          'sixteen','seventeen','eighteen','nineteen','twenty'];
        return parseInt(n) < 20 ? words[parseInt(n)] : n;
      });
  },

  speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const spokenText = this._addCadence(text);
    const utt = new SpeechSynthesisUtterance(spokenText);
    if (this._voice) utt.voice  = this._voice;
    utt.rate   = this._rate;
    utt.pitch  = this._pitch;
    utt.volume = this._volume;

    // Chrome bug: long utterances get cut off — split at sentence boundary
    // and chain them with minimal gap
    setTimeout(() => {
      window.speechSynthesis.speak(utt);
    }, 80);
  },

  // Expose controls so staff can tune from UI
  setRate(r)   { this._rate   = Math.max(0.5, Math.min(2, r)); },
  setPitch(p)  { this._pitch  = Math.max(0, Math.min(2, p)); },
  getVoiceName() { return this._voice?.name || 'No voice'; },
};

TTS.init();

/* ── Voice response phrases — name spoken at end of every confirmation ── */
function buildVoiceResponse(intent, item, qty, orderNum, speakerName) {
  const n    = qty > 1 ? `${qty} ${item}` : `${item}`;
  const ref  = orderNum  ? `. Order ${orderNum}` : "";
  const who  = speakerName ? `. ${speakerName}` : "";

  switch(intent) {
    case "ORDER":      return `Order logged${ref}. ${n} to kitchen${who}.`;
    case "MAKING":     return `Got it. Making ${n}${who}.`;
    case "WASTE":      return `Waste logged. ${n}${who}.`;
    case "DISCARDING": return `Discard logged. ${n}${who}.`;
    case "PREPARED":   return `Ready. ${n} fulfilled${who}.`;
    case "CLOSE":      return `Order ${orderNum} closed and fulfilled${who}.`;
    default:           return `Logged. ${n}${who}.`;
  }
}

function buildNotFoundResponse() {
  return "Sorry. That item is not in our store directory. Please try again.";
}

function buildConfusionResponse(type) {
  switch(type) {
    case "qty":   return "I didn't catch the number. Please repeat the quantity.";
    case "item":  return "I'm not sure which item. Could you say that again?";
    case "both":  return "Please repeat. I need the item and quantity.";
    case "close": return "Which order number should I close? Please repeat.";
    default:      return "Sorry, could you repeat that?";
  }
}

function buildWakeResponse() {
  return "Listening.";
}

function buildCloseResponse(orderNum, item, qty, speakerName) {
  const who = speakerName ? `. ${speakerName}` : "";
  return `Order ${orderNum} closed. ${qty} ${item} fulfilled${who}.`;
}

/* ═══════════════════════════════════════════════════════════════
   VOICE ENROLLMENT & SPEAKER IDENTIFICATION
   Each staff member records 10 seconds. We extract:
   - Average pitch (fundamental frequency)
   - Pitch variance (how much pitch varies — unique per person)
   - Speech energy (how loud/soft they speak)
   - Speech rate (syllables per second estimate)
   These 4 features form a voice fingerprint stored per location.
═══════════════════════════════════════════════════════════════ */

// Storage keys
const ENROLL_KEY = (rid, sid) => `vcs-voice-${rid}-${sid}`;
const ENROLL_LIST_KEY = (rid) => `vcs-enrolled-${rid}`;

// Extract voice features from an array of pitch/energy samples
function extractVoiceFeatures(pitchSamples, energySamples) {
  if (!pitchSamples.length) return null;
  const validPitches = pitchSamples.filter(p => p > 50 && p < 600);
  if (validPitches.length < 5) return null;

  const mean = validPitches.reduce((a,b)=>a+b,0) / validPitches.length;
  const variance = validPitches.reduce((a,b)=>a+(b-mean)**2,0) / validPitches.length;
  const stdDev = Math.sqrt(variance);

  const meanEnergy = energySamples.reduce((a,b)=>a+b,0) / energySamples.length;
  const energyVar  = energySamples.reduce((a,b)=>a+(b-meanEnergy)**2,0) / energySamples.length;

  return {
    meanPitch:    Math.round(mean),
    stdPitch:     Math.round(stdDev),
    meanEnergy:   parseFloat(meanEnergy.toFixed(4)),
    energyStd:    parseFloat(Math.sqrt(energyVar).toFixed(4)),
    sampleCount:  validPitches.length,
  };
}

// Compare two fingerprints — returns similarity 0–1
function compareFingerprints(a, b) {
  if (!a || !b) return 0;

  // Weighted euclidean distance, normalised by expected ranges
  const pitchDiff   = Math.abs(a.meanPitch - b.meanPitch) / 150;   // ±150Hz spread
  const stdDiff     = Math.abs(a.stdPitch   - b.stdPitch)   / 60;   // ±60Hz variance
  const energyDiff  = Math.abs(a.meanEnergy - b.meanEnergy) / 0.05; // ±0.05 energy

  const dist = Math.sqrt(
    0.5 * pitchDiff**2 +
    0.3 * stdDiff**2  +
    0.2 * energyDiff**2
  );

  return Math.max(0, 1 - dist);
}

// Save a voice profile to storage
async function saveVoiceProfile(restaurantId, staffId, features) {
  try {
    await window.storage.set(ENROLL_KEY(restaurantId, staffId), JSON.stringify(features));
    const listRaw = await window.storage.get(ENROLL_LIST_KEY(restaurantId)).catch(()=>null);
    const list = listRaw ? JSON.parse(listRaw.value) : [];
    if (!list.includes(staffId)) list.push(staffId);
    await window.storage.set(ENROLL_LIST_KEY(restaurantId), JSON.stringify(list));
    return true;
  } catch(e) {
    // Fallback to memory
    if (!window._voiceProfiles) window._voiceProfiles = {};
    window._voiceProfiles[`${restaurantId}-${staffId}`] = features;
    return true;
  }
}

// Load all voice profiles for a restaurant
async function loadVoiceProfiles(restaurantId, staffList) {
  const profiles = {};
  for (const staff of staffList) {
    try {
      const raw = await window.storage.get(ENROLL_KEY(restaurantId, staff.id));
      if (raw) profiles[staff.id] = JSON.parse(raw.value);
    } catch(e) {
      const mem = window._voiceProfiles?.[`${restaurantId}-${staff.id}`];
      if (mem) profiles[staff.id] = mem;
    }
  }
  return profiles;
}

// Identify speaker from live pitch/energy samples
function identifySpeaker(livePitches, liveEnergies, profiles, staffList) {
  const liveFeatures = extractVoiceFeatures(livePitches, liveEnergies);
  if (!liveFeatures) return { id: null, name: "Unknown", confidence: 0 };

  let bestId = null, bestScore = 0.45; // Min threshold to claim identity

  for (const staff of staffList) {
    const profile = profiles[staff.id];
    if (!profile) continue;
    const score = compareFingerprints(liveFeatures, profile);
    if (score > bestScore) { bestScore = score; bestId = staff.id; }
  }

  if (!bestId) return { id: null, name: null, confidence: bestScore };

  const staff = staffList.find(s => s.id === bestId);
  const firstName = staff?.name?.split(' ')[0] || "Staff";
  return { id: bestId, name: firstName, fullName: staff?.name, confidence: bestScore };
}

/* ═══════════════════════════════════════════════════════════════
   PITCH DETECTION (Web Audio — voice fingerprinting)
═══════════════════════════════════════════════════════════════ */
function detectPitch(analyser) {
  const SIZE = analyser.fftSize;
  const buf = new Float32Array(SIZE);
  analyser.getFloatTimeDomainData(buf);
  const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / SIZE);
  if (rms < 0.008) return { pitch: 0, energy: rms };
  const sr = analyser.context.sampleRate;
  const lo = Math.floor(sr / 600), hi = Math.min(Math.floor(sr / 70), SIZE - 1);
  let maxC = 0, bestLag = -1;
  for (let lag = lo; lag <= hi; lag++) {
    let c = 0;
    for (let i = 0; i < SIZE - lag; i++) c += buf[i] * buf[i + lag];
    c /= (SIZE - lag);
    if (c > maxC) { maxC = c; bestLag = lag; }
  }
  return { pitch: bestLag > 0 ? sr / bestLag : 0, energy: rms };
}

/* ═══════════════════════════════════════════════════════════════
   STORAGE — window.storage adapter with memory fallback
═══════════════════════════════════════════════════════════════ */
const mem = {};
const DB = {
  async get(key) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
    catch { return mem[key] ?? null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val)); }
    catch { mem[key] = val; }
    return val;
  },
  async list(prefix) {
    try { const r = await window.storage.list(prefix); return r?.keys || []; }
    catch { return Object.keys(mem).filter(k => k.startsWith(prefix)); }
  },
};

/* ═══════════════════════════════════════════════════════════════
   ORDER NUMBER SYSTEM — Short refs #1–999, voice-friendly
   Orders stay short so staff can say "close order 12" naturally
═══════════════════════════════════════════════════════════════ */
const orderCounter = { n: 0, freed: [] };

function genOrderNum() {
  // Reuse freed numbers first, else increment
  if (orderCounter.freed.length) return orderCounter.freed.shift();
  orderCounter.n = (orderCounter.n % 999) + 1;
  return orderCounter.n;
}

function freeOrderNum(num) {
  if (num && !orderCounter.freed.includes(num)) orderCounter.freed.push(num);
}

function genId(rid) {
  const num = genOrderNum();
  return num; // Returns plain integer 1–999
}

// Format for display vs speech
function fmtOrderId(n) { return `#${n}`; }
function speakOrderId(n) { return `order ${n}`; }

/* ═══════════════════════════════════════════════════════════════
   PREDICTIVE ENGINE (simple rolling hourly average)
═══════════════════════════════════════════════════════════════ */
const HISTORICAL = {
  hashbrowns:   [0,0,0,0,8,18,28,24,20,12,8,10,14,16,10,6,4,2,0,0,0,0,0,0],
  timbits:      [0,0,0,0,5,12,20,18,16,14,10,8,12,14,10,8,6,4,2,0,0,0,0,0],
  coffee:       [0,0,0,0,10,30,55,48,42,35,25,28,34,38,28,20,15,10,6,3,0,0,0,0],
  icedcapp:     [0,0,0,0,0,2,6,8,10,8,6,4,6,8,10,8,6,4,2,1,0,0,0,0],
  bfastsand:    [0,0,0,0,6,16,26,22,18,10,6,4,6,8,4,2,1,0,0,0,0,0,0,0],
  donut:        [0,0,0,0,4,10,16,14,12,8,6,8,10,12,8,6,4,2,1,0,0,0,0,0],
};

function getPrediction(itemId) {
  const hour = new Date().getHours();
  const hist = HISTORICAL[itemId];
  if (!hist) return 10;
  return hist[hour] || 5;
}

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS DATA  (seed with plausible 7-day history)
═══════════════════════════════════════════════════════════════ */
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const weeklyData = DAYS.map((day, i) => ({
  day,
  orders:     [342,289,401,378,512,634,498][i],
  waste:      [18,22,15,19,28,31,24][i],
  efficiency: [94,92,96,95,91,90,93][i],
  revenue:    [2840,2390,3320,3130,4240,5260,4120][i],
}));

function buildHourly() {
  return Array.from({length:14}, (_,i) => {
    const h = i + 6;
    const predicted = HISTORICAL.hashbrowns[h] || 0;
    return {
      hour: `${h}:00`,
      predicted,
      actual: Math.max(0, predicted + Math.round((Math.random()-.5)*6)),
      waste:  Math.max(0, Math.round(Math.random()*3)),
    };
  });
}
const hourlyData = buildHourly();

/* ═══════════════════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Barlow:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:${C.bg};color:${C.text};font-family:'Barlow',sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:${C.surface};}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
button{cursor:pointer;font-family:'Barlow',sans-serif;}
input,select{font-family:'Barlow',sans-serif;outline:none;}
@keyframes pulse-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.8);opacity:0}}
@keyframes breathe{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes flash{0%{background:${C.orange}22}100%{background:transparent}}
@keyframes spin{to{transform:rotate(360deg)}}
.fadeUp{animation:fadeUp .3s ease forwards}
.slideRight{animation:slideRight .3s ease forwards}
.flash-row{animation:flash 1.5s ease forwards}
`;

function IntentChip({ intent }) {
  const cfg = {
    ORDER:      { bg:"#1E3A5F", border:"#2563EB", text:"#60A5FA", icon:"📋" },
    MAKING:     { bg:"#14532D", border:"#16A34A", text:"#4ADE80", icon:"🔧" },
    WASTE:      { bg:"#450A0A", border:"#DC2626", text:"#F87171", icon:"🗑️" },
    DISCARDING: { bg:"#422006", border:"#D97706", text:"#FBB546", icon:"⚠️" },
    PREPARED:   { bg:"#2E1065", border:"#7C3AED", text:"#A78BFA", icon:"✅" },
  };
  const s = cfg[intent] || { bg:C.card, border:C.border, text:C.textMid, icon:"💬" };
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"2px 8px", borderRadius:4,
      background:s.bg, border:`1px solid ${s.border}44`,
      color:s.text, fontSize:10, fontWeight:700,
      letterSpacing:.8, fontFamily:"'IBM Plex Mono',monospace",
    }}>
      {s.icon} {intent}
    </span>
  );
}

function StatusChip({ status, override }) {
  if (override) return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4,
      padding:"2px 8px", borderRadius:4,
      background:"#450A0A", border:"1px solid #DC262644",
      color:"#F87171", fontSize:10, fontWeight:700, letterSpacing:.8,
      fontFamily:"'IBM Plex Mono',monospace" }}>⚑ OVERRIDE</span>
  );
  const cfg = {
    PENDING:      { bg:"#422006", border:"#D97706", text:"#FBB546", label:"PENDING" },
    ACKNOWLEDGED: { bg:"#1E3A5F", border:"#2563EB", text:"#60A5FA", label:"ACK'D" },
    FULFILLED:    { bg:"#14532D", border:"#16A34A", text:"#4ADE80", label:"FULFILLED" },
    CLOSED:       { bg:C.card,    border:C.border,  text:C.textDim, label:"CLOSED" },
  };
  const s = cfg[status] || cfg.PENDING;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:4,
      background:s.bg, border:`1px solid ${s.border}44`,
      color:s.text, fontSize:10, fontWeight:700, letterSpacing:.8,
      fontFamily:"'IBM Plex Mono',monospace",
    }}>{s.label}</span>
  );
}

function Card({ children, style={}, glow=false }) {
  return (
    <div style={{
      background:C.card, border:`1px solid ${glow?C.orangeDim:C.border}`,
      borderRadius:8, padding:16,
      boxShadow: glow ? `0 0 24px ${C.orange}1A` : "none",
      ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      marginBottom:12 }}>
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:2,
        color:C.textDim, fontFamily:"'IBM Plex Mono',monospace" }}>{children}</span>
      {right && <span style={{ fontSize:10, color:C.textDim }}>{right}</span>}
    </div>
  );
}

function Avatar({ staff, size=28 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:staff.color, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size*0.38, fontWeight:800,
      color:"#fff", letterSpacing:.5,
    }}>{staff.initials}</div>
  );
}

function VoiceWave({ active, color=C.orange, bars=24 }) {
  const [heights, setHeights] = useState(Array(bars).fill(4));
  useEffect(() => {
    if (!active) { setHeights(Array(bars).fill(4)); return; }
    const id = setInterval(() => {
      setHeights(Array.from({length:bars}, () => 4 + Math.random()*30));
    }, 80);
    return () => clearInterval(id);
  }, [active, bars]);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, height:40 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width:3, borderRadius:2, background:color,
          height:`${h}px`, opacity:.7 + h/100,
          transition:"height 0.08s ease",
        }} />
      ))}
    </div>
  );
}

function PulseOrb({ state }) {
  // state: idle | waking | awake | processing
  const cfg = {
    idle:       { color:C.textDim,   glow:"transparent", icon:"🎙️", label:"STANDBY" },
    waking:     { color:C.amber,     glow:C.amber,       icon:"👂", label:"DETECTED" },
    awake:      { color:C.green,     glow:C.green,       icon:"🎙️", label:"LISTENING" },
    processing: { color:C.orange,    glow:C.orange,      icon:"⚙️", label:"PROCESSING" },
  };
  const c = cfg[state] || cfg.idle;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <div style={{ position:"relative", width:96, height:96,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {(state==="awake"||state==="waking") && [0,1,2].map(i => (
          <div key={i} style={{
            position:"absolute", width:96, height:96, borderRadius:"50%",
            border:`1.5px solid ${c.color}`,
            animation:`pulse-ring 2.4s ease-out ${i*0.8}s infinite`,
          }} />
        ))}
        <div style={{
          width:72, height:72, borderRadius:"50%",
          background:`${c.color}18`,
          border:`2px solid ${c.color}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28,
          boxShadow: state!=="idle" ? `0 0 32px ${c.glow}44` : "none",
          transition:"all .4s ease",
        }}>{c.icon}</div>
      </div>
      <span style={{ fontSize:11, fontWeight:700, letterSpacing:2,
        color:c.color, fontFamily:"'IBM Plex Mono',monospace" }}>{c.label}</span>
    </div>
  );
}

function Toast({ msg, color }) {
  return (
    <div style={{
      position:"fixed", top:20, right:20, zIndex:9999,
      background:C.card, border:`1px solid ${color}`,
      borderRadius:8, padding:"10px 18px",
      color, fontSize:13, fontWeight:600,
      boxShadow:`0 4px 32px ${color}44`,
      animation:"slideRight .3s ease",
      maxWidth:320, backdropFilter:"blur(8px)",
    }}>{msg}</div>
  );
}

function ConfidenceMeter({ value }) {
  const pct = Math.round(value * 100);
  const color = pct>75 ? C.green : pct>50 ? C.amber : C.danger;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:3, background:C.border, borderRadius:2 }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color,
          borderRadius:2, transition:"width .3s ease" }} />
      </div>
      <span style={{ fontSize:10, color, fontFamily:"'IBM Plex Mono',monospace",
        minWidth:28 }}>{pct}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SPEECH ENGINE HOOK — real Web Speech API
═══════════════════════════════════════════════════════════════ */
function useSpeechEngine({ onInterim, onFinal, enabled }) {
  const recRef       = useRef(null);
  const runRef       = useRef(false);
  const onFinalRef   = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState("unknown");

  // Noise filtering — track last N transcripts to detect repetitive noise
  const noiseHistoryRef   = useRef([]);
  const silenceTimerRef   = useRef(null);
  const lastFinalTextRef  = useRef("");
  const lastFinalTimeRef  = useRef(0);

  useEffect(() => { onFinalRef.current  = onFinal;  }, [onFinal]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  /* ── Noise Gate ─────────────────────────────────────────────
     Rejects transcripts that look like background noise:
     1. Too short (< 2 real words)
     2. Identical to the last thing we heard within 1.5s (echo/repeat)
     3. Purely punctuation or filler sounds ("um", "uh", "mm", "ah")
     4. Low confidence AND very short
  ──────────────────────────────────────────────────────────── */
  function passesNoiseGate(text, confidence) {
    const t = text.toLowerCase().trim();

    // RULE 1 — reject pure noise sounds and single-character transcripts
    if (/^(um+|uh+|mm+|ah+|oh+|hmm+|huh|er|erm|shh|background|noise|\.|,|!|\?)$/i.test(t)) return false;

    // RULE 2 — reject if fewer than 2 chars (stray phoneme)
    if (t.replace(/\s/g,'').length < 2) return false;

    // RULE 3 — reject exact duplicate within 1.5 seconds (mic feedback loop)
    const now = Date.now();
    if (t === lastFinalTextRef.current && now - lastFinalTimeRef.current < 1500) return false;

    // RULE 4 — reject if confidence < 0.4 AND less than 3 words (noisy gibberish)
    const wordCount = t.split(/\s+/).filter(Boolean).length;
    if (confidence < 0.4 && wordCount < 3) return false;

    // RULE 5 — reject repeating noise pattern (same word heard 3x in history)
    noiseHistoryRef.current.push(t);
    if (noiseHistoryRef.current.length > 8) noiseHistoryRef.current.shift();
    const repeatCount = noiseHistoryRef.current.filter(h => h === t).length;
    if (repeatCount >= 3) return false;

    return true;
  }

  /* ── Best Alternative Picker ─────────────────────────────────
     Web Speech returns up to maxAlternatives transcripts.
     In noisy environments the top result is often wrong.
     We pick the alternative that:
     - Has the highest confidence, OR
     - Contains a known wake word / menu item keyword
  ──────────────────────────────────────────────────────────── */
  const KNOWN_KEYWORDS = [
    'hey','timmy','timms','tim','order','making','waste','close',
    'hashbrowns','timbits','coffee','donut','muffin','bagel','sandwich',
    'croissant','soup','cookie','french','vanilla','steeped','tea',
    'iced','capp','hot','chocolate','breakfast','wrap','need','want',
    'give','get','prepare','discard','ready','done','finish','fulfill',
  ];

  function pickBestAlternative(results) {
    if (!results.length) return { text: "", confidence: 0 };

    let best = { text: results[0].transcript.trim(), confidence: results[0].confidence || 0.5 };

    for (let i = 1; i < results.length; i++) {
      const alt   = results[i];
      const t     = alt.transcript.trim().toLowerCase();
      const conf  = alt.confidence || 0.3;

      // Boost score if it contains known keywords (domain-specific boost)
      const keywordHits = KNOWN_KEYWORDS.filter(k => t.includes(k)).length;
      const boostedConf = conf + keywordHits * 0.08;

      if (boostedConf > best.confidence) {
        best = { text: alt.transcript.trim(), confidence: boostedConf };
      }
    }

    return best;
  }

  const buildRec = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return null; }
    setSupported(true);

    const rec = new SR();
    rec.continuous      = !isMobile;
    rec.interimResults  = true;
    rec.lang            = "en-US";
    rec.maxAlternatives = 5;  // Get 5 alternatives — helps in noisy env

    rec.onstart = () => setPermission("granted");

    rec.onerror = (e) => {
      if (e.error === "not-allowed") { setPermission("denied"); return; }
      if (e.error === "no-speech") {
        // Normal in noisy env — just restart quietly
        if (runRef.current) setTimeout(() => { if (runRef.current) startNew(); }, 200);
        return;
      }
      if (e.error === "audio-capture") {
        // Mic temporarily lost — retry after short pause
        if (runRef.current) setTimeout(() => { if (runRef.current) startNew(); }, 1000);
        return;
      }
      if (e.error === "network") {
        if (runRef.current) setTimeout(() => { if (runRef.current) startNew(); }, 1500);
        return;
      }
      if (runRef.current && e.error !== "aborted") {
        setTimeout(() => { if (runRef.current) startNew(); }, 800);
      }
    };

    rec.onend = () => {
      if (runRef.current) {
        // On mobile: shorter restart gap so we don't miss the next phrase
        // On desktop: slightly longer to avoid thrashing
        const delay = isMobile ? 100 : 250;
        setTimeout(() => { if (runRef.current) startNew(); }, delay);
      }
    };

    rec.onresult = (ev) => {
      // Clear silence timer on any result
      clearTimeout(silenceTimerRef.current);

      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];

        if (res.isFinal) {
          // Pick best across all alternatives
          const { text, confidence } = pickBestAlternative(Array.from(res));

          if (!text) continue;

          // Run through noise gate
          if (!passesNoiseGate(text, confidence)) {
            console.debug("[VCS] Noise gate rejected:", text, confidence.toFixed(2));
            continue;
          }

          // Record for duplicate detection
          lastFinalTextRef.current = text.toLowerCase().trim();
          lastFinalTimeRef.current = Date.now();

          onFinalRef.current(text, confidence);
        } else {
          // Show interim text — use top alternative
          const t = res[0].transcript.trim();
          if (t.length > 1) onInterimRef.current(t);
        }
      }
    };

    return rec;
  }, [isMobile]);

  function startNew() {
    try {
      const rec = buildRec();
      if (!rec) return;
      recRef.current = rec;
      rec.start();
    } catch(e) {
      // Already started or other transient error — retry
      setTimeout(() => { if (runRef.current) startNew(); }, 600);
    }
  }

  const start = useCallback(() => {
    runRef.current = true;
    startNew();
  }, [buildRec]);

  const stop = useCallback(() => {
    runRef.current = false;
    try { recRef.current?.stop(); } catch {}
    try { recRef.current?.abort(); } catch {}
  }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  useEffect(() => {
    if (enabled) start(); else stop();
    return () => stop();
  }, [enabled]);

  return { supported, permission, start, stop };
}

/* ═══════════════════════════════════════════════════════════════
   COMMAND VIEW
═══════════════════════════════════════════════════════════════ */
function CommandView({ voiceState, interim, recentEvents, staff, currentSpeaker, setCurrentSpeaker, onManualCommand, liveSpeaker }) {
  const [manualText, setManualText] = useState("");

  return (
    <div style={{ padding:20, maxWidth:860, margin:"0 auto" }}>

      {/* ─ Orb + transcript ─ */}
      <Card glow={voiceState==="awake"} style={{ textAlign:"center", padding:"32px 24px", marginBottom:16 }}>
        <PulseOrb state={voiceState} />

        {/* Live speaker ID badge */}
        {liveSpeaker && (
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8, marginTop:12,
            padding:"5px 14px", borderRadius:20,
            background:`${liveSpeaker.confidence>0.7 ? C.green : C.amber}22`,
            border:`1px solid ${liveSpeaker.confidence>0.7 ? C.green : C.amber}`,
          }}>
            <span style={{
              width:8, height:8, borderRadius:"50%",
              background: liveSpeaker.confidence>0.7 ? C.green : C.amber,
              display:"inline-block",
            }}/>
            <span style={{fontSize:12, fontWeight:800, color:C.text}}>
              {liveSpeaker.name}
            </span>
            <span style={{fontSize:10, color:C.textDim}}>
              {Math.round(liveSpeaker.confidence*100)}%
            </span>
          </div>
        )}

        <div style={{ marginTop:20 }}>
          {voiceState==="idle" && (
            <p style={{ color:C.textMid, fontSize:13, lineHeight:1.8 }}>
              Say <strong style={{color:C.orange}}>"Hey Timmy"</strong> to wake, then speak any command.<br/>
              <span style={{ fontSize:12, color:C.textDim }}>ORDER · MAKING · WASTE · DISCARDING · PREPARED</span>
            </p>
          )}
          {voiceState==="awake" && (
            <div>
              <VoiceWave active={true} />
              <p style={{ color:C.green, fontSize:12, marginTop:8, letterSpacing:1 }}>Listening for your command…</p>
            </div>
          )}
          {voiceState==="processing" && (
            <p style={{ color:C.orange, fontSize:12, letterSpacing:1 }}>⚙️ Processing command…</p>
          )}
        </div>
        {interim && (
          <div style={{
            marginTop:16, padding:"10px 16px",
            background:C.surface, borderRadius:6,
            border:`1px solid ${C.orangeDim}`,
            fontStyle:"italic", fontSize:14, color:C.text,
          }}>
            "{interim}<span style={{animation:"blink 1s infinite"}}>|</span>"
          </div>
        )}

        {/* Manual command fallback */}
        <div style={{ display:"flex", gap:8, marginTop:20 }}>
          <input
            value={manualText}
            onChange={e=>setManualText(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&manualText.trim()){ onManualCommand(manualText); setManualText(""); }}}
            placeholder='Or type a command: "Order 6 Hashbrowns"'
            style={{
              flex:1, padding:"10px 14px", borderRadius:6,
              background:C.surface, border:`1px solid ${C.border}`,
              color:C.text, fontSize:13,
            }}
          />
          <button
            onClick={()=>{ if(manualText.trim()){ onManualCommand(manualText); setManualText(""); }}}
            style={{
              padding:"10px 20px", borderRadius:6,
              background:`${C.orange}22`, border:`1px solid ${C.orange}`,
              color:C.orange, fontWeight:700, fontSize:12,
            }}>SEND</button>
        </div>
      </Card>

      {/* ─ Speaker Select ─ */}
      <Card style={{ marginBottom:16 }}>
        <SectionLabel>VOICE PRINT — WHO'S SPEAKING?</SectionLabel>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {staff.map(s => (
            <div
              key={s.id}
              onClick={()=>setCurrentSpeaker(s)}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 14px", borderRadius:20, cursor:"pointer",
                background: currentSpeaker?.id===s.id ? `${s.color}22` : C.surface,
                border: `1.5px solid ${currentSpeaker?.id===s.id ? s.color : C.border}`,
                transition:"all .15s ease",
              }}
            >
              <Avatar staff={s} size={26} />
              <div>
                <div style={{ fontSize:12, fontWeight:700, color: currentSpeaker?.id===s.id ? s.color : C.text }}>
                  {s.name}
                </div>
                <div style={{ fontSize:10, color:C.textDim }}>{s.role}</div>
              </div>
              {currentSpeaker?.id===s.id && (
                <div style={{ width:6, height:6, borderRadius:"50%", background:C.green,
                  boxShadow:`0 0 6px ${C.green}` }} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ─ Live feed ─ */}
      <Card>
        <SectionLabel right={<span style={{color:C.green}}>● LIVE</span>}>VOICE EVENT LOG</SectionLabel>
        {recentEvents.length===0 && (
          <div style={{ textAlign:"center", padding:32, color:C.textDim, fontSize:12 }}>
            No commands yet. Activate the system above or type a command.
          </div>
        )}
        <div style={{ maxHeight:300, overflowY:"auto", display:"flex", flexDirection:"column", gap:2 }}>
          {recentEvents.slice(0,20).map(ev => (
            <div key={ev.id} className="fadeUp" style={{
              display:"flex", gap:12, alignItems:"flex-start",
              padding:"10px 0", borderBottom:`1px solid ${C.border}`,
            }}>
              {ev.staff && <Avatar staff={ev.staff} size={30} />}
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:ev.staff?.color||C.textMid }}>
                    {ev.staff?.name||"Unknown Speaker"}
                  </span>
                  <span style={{ fontSize:10, color:C.textDim, fontFamily:"'IBM Plex Mono',monospace" }}>
                    {new Date(ev.ts).toLocaleTimeString()}
                  </span>
                  {ev.intent && <IntentChip intent={ev.intent} />}
                  {ev.orderId && (
                    <span style={{ fontSize:10, color:C.orange, fontFamily:"'IBM Plex Mono',monospace" }}>
                      → {ev.orderId}
                    </span>
                  )}
                </div>
                <div style={{ fontSize:13, color:C.text }}>"{ev.text}"</div>
                {ev.confidence != null && <ConfidenceMeter value={ev.confidence} />}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ORDERS VIEW
═══════════════════════════════════════════════════════════════ */
function OrderCard({ order, staff, onAck, onFulfill }) {
  const s = staff.find(x=>x.id===order.speakerId);
  const elapsed = Math.round((Date.now()-order.timeCreated)/1000);
  const urgent = order.intent==="ORDER" && order.status!=="FULFILLED" && order.status!=="CLOSED" && elapsed>90;
  return (
    <Card style={{ marginBottom:10 }} glow={order.status==="PENDING"&&order.intent==="ORDER"}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.orange }}>
          {order.id}
        </span>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          {urgent && <span style={{ fontSize:10, color:C.danger, fontWeight:700 }}>⚠ URGENT</span>}
          <div style={{ width:7, height:7, borderRadius:"50%",
            background: order.status==="PENDING"?C.amber : order.status==="ACKNOWLEDGED"?C.blue :
                        order.status==="FULFILLED"?C.green : C.textDim,
            boxShadow: urgent ? `0 0 8px ${C.danger}` : "none",
          }} />
        </div>
      </div>
      <div style={{ fontSize:20, fontWeight:900, color:C.text, marginBottom:6 }}>
        <span style={{ color:C.orange }}>{order.qty}×</span> {order.item}
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        <IntentChip intent={order.intent} />
        <StatusChip status={order.status} override={order.overrideFlag} />
      </div>
      {s && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <Avatar staff={s} size={22} />
          <span style={{ fontSize:12, color:s.color, fontWeight:600 }}>{s.name}</span>
          <span style={{ fontSize:11, color:C.textDim }}>· {s.role}</span>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10 }}>
        {[
          {label:"CREATED", val:order.timeCreated},
          {label:"ACK",     val:order.timeAck},
          {label:"DONE",    val:order.timeFulfilled},
        ].map(t=>(
          <div key={t.label} style={{ background:C.surface, borderRadius:4, padding:"6px 8px" }}>
            <div style={{ fontSize:9, color:C.textDim, fontFamily:"'IBM Plex Mono',monospace", marginBottom:2 }}>{t.label}</div>
            <div style={{ fontSize:10, color:t.val?C.text:C.textDim, fontFamily:"'IBM Plex Mono',monospace" }}>
              {t.val ? new Date(t.val).toLocaleTimeString() : "——"}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {order.status==="PENDING"&&order.intent==="ORDER" && (
          <button onClick={()=>onAck(order.id)} style={{
            flex:1, padding:"7px 0", borderRadius:5,
            background:`${C.blue}22`, border:`1px solid ${C.blue}`,
            color:C.blue, fontWeight:700, fontSize:11, letterSpacing:1,
          }}>ACKNOWLEDGE</button>
        )}
        {order.status==="ACKNOWLEDGED" && (
          <button onClick={()=>onFulfill(order.id)} style={{
            flex:1, padding:"7px 0", borderRadius:5,
            background:`${C.green}22`, border:`1px solid ${C.green}`,
            color:C.green, fontWeight:700, fontSize:11, letterSpacing:1,
          }}>✓ MARK FULFILLED</button>
        )}
      </div>
    </Card>
  );
}

function OrdersView({ orders, staff, onAck, onFulfill }) {
  const active = orders.filter(o=>["PENDING","ACKNOWLEDGED"].includes(o.status));
  const closed = orders.filter(o=>["FULFILLED","CLOSED"].includes(o.status));
  return (
    <div style={{ padding:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"start" }}>
      <div>
        <SectionLabel right={<span style={{color:C.orange}}>{active.length} active</span>}>ACTIVE ORDERS</SectionLabel>
        {active.length===0&&<div style={{color:C.textDim,fontSize:12,padding:24,textAlign:"center",background:C.card,borderRadius:8}}>No active orders</div>}
        {active.map(o=><OrderCard key={o.id} order={o} staff={staff} onAck={onAck} onFulfill={onFulfill}/>)}
      </div>
      <div>
        <SectionLabel right={<span style={{color:C.textDim}}>{closed.length} records</span>}>COMPLETED</SectionLabel>
        {closed.length===0&&<div style={{color:C.textDim,fontSize:12,padding:24,textAlign:"center",background:C.card,borderRadius:8}}>No completed orders yet</div>}
        {closed.slice(0,10).map(o=><OrderCard key={o.id} order={o} staff={staff} onAck={onAck} onFulfill={onFulfill}/>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KITCHEN VIEW
═══════════════════════════════════════════════════════════════ */
function KitchenView({ orders, staff, onAck, onFulfill }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id=setInterval(()=>setTick(t=>t+1),5000); return ()=>clearInterval(id); }, []);
  const queue = orders.filter(o=>o.intent==="ORDER"&&["PENDING","ACKNOWLEDGED"].includes(o.status))
    .sort((a,b)=>a.timeCreated-b.timeCreated);

  return (
    <div style={{ padding:20, background:C.bg, minHeight:"100%" }}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:12, fontWeight:700, letterSpacing:4, color:C.textDim,
          fontFamily:"'IBM Plex Mono',monospace" }}>
          ═══ KITCHEN DISPLAY SYSTEM ═══
        </div>
        <div style={{ fontSize:11, color:C.textDim, marginTop:4 }}>
          {new Date().toLocaleString()} · {queue.length} in queue
        </div>
      </div>

      {queue.length===0 && (
        <div style={{ textAlign:"center", padding:80, color:C.textDim }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✓</div>
          <div style={{ fontSize:16, fontWeight:700 }}>Kitchen Clear</div>
          <div style={{ fontSize:12, marginTop:8 }}>All orders fulfilled</div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
        {queue.map(o => {
          const s = staff.find(x=>x.id===o.speakerId);
          const wait = Math.round((Date.now()-o.timeCreated)/1000);
          const urgent = wait>90;
          const borderColor = urgent?C.danger : o.status==="ACKNOWLEDGED"?C.blue : C.amber;
          return (
            <div key={o.id} style={{
              background:C.card, border:`2px solid ${borderColor}`,
              borderRadius:10, padding:16,
              boxShadow: urgent ? `0 0 24px ${C.danger}44` : "none",
              transition:"border-color .3s ease",
            }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:C.textDim, marginBottom:6 }}>
                {o.id}
              </div>
              <div style={{ fontSize:36, fontWeight:900, color:urgent?C.danger:C.text, lineHeight:1 }}>
                {o.qty}×
              </div>
              <div style={{ fontSize:20, fontWeight:800, color:C.orange, marginBottom:8 }}>
                {o.item}
              </div>
              {s && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                  <Avatar staff={s} size={18} />
                  <span style={{ fontSize:11, color:s.color }}>{s.name}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <StatusChip status={o.status} override={o.overrideFlag} />
                <span style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
                  color:urgent?C.danger:C.textMid, fontWeight:urgent?700:400 }}>
                  ⏱ {wait}s {urgent?"⚠":""}
                </span>
              </div>
              {o.status==="PENDING" && (
                <button onClick={()=>onAck(o.id)} style={{
                  width:"100%", padding:"8px 0", borderRadius:6,
                  background:`${C.blue}22`, border:`1px solid ${C.blue}`,
                  color:C.blue, fontWeight:800, fontSize:12, letterSpacing:1,
                }}>▶ START</button>
              )}
              {o.status==="ACKNOWLEDGED" && (
                <button onClick={()=>onFulfill(o.id)} style={{
                  width:"100%", padding:"8px 0", borderRadius:6,
                  background:`${C.green}22`, border:`1px solid ${C.green}`,
                  color:C.green, fontWeight:800, fontSize:12, letterSpacing:1,
                }}>✓ DONE</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATABASE VIEW
═══════════════════════════════════════════════════════════════ */
function DatabaseView({ orders, voiceEvents, staff }) {
  const [table, setTable] = useState("orders");
  const [search, setSearch] = useState("");
  const [filterIntent, setFilterIntent] = useState("ALL");
  const [latestId, setLatestId] = useState(null);

  useEffect(() => {
    if (orders.length>0) {
      const newest = [...orders].sort((a,b)=>b.timeCreated-a.timeCreated)[0];
      setLatestId(newest.id);
      const t = setTimeout(()=>setLatestId(null), 2500);
      return ()=>clearTimeout(t);
    }
  }, [orders.length]);

  const iso = ts => ts ? new Date(ts).toISOString().replace("T"," ").slice(0,19) : "NULL";
  const dur = (a,b) => (a&&b) ? `${((b-a)/1000).toFixed(1)}s` : "—";

  const filtered = orders
    .filter(o=>filterIntent==="ALL"||o.intent===filterIntent)
    .filter(o=>!search||o.id.toLowerCase().includes(search.toLowerCase())||o.item?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>b.timeCreated-a.timeCreated);

  const wasteRows = orders.filter(o=>["WASTE","DISCARDING"].includes(o.intent));
  const overrideRows = orders.filter(o=>o.overrideFlag);

  const tables = [
    { id:"orders",         label:"orders",          count:orders.length },
    { id:"voice_events",   label:"voice_events",    count:voiceEvents.length },
    { id:"waste_log",      label:"waste_log",        count:wasteRows.length },
    { id:"override_flags", label:"override_flags",  count:overrideRows.length },
  ];

  const TH = ({ children, minW=80 }) => (
    <th style={{ padding:"9px 12px", textAlign:"left", fontSize:9, letterSpacing:1.2,
      color:C.textDim, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace",
      borderBottom:`1px solid ${C.border}`, background:C.surface,
      whiteSpace:"nowrap", minWidth:minW }}>{children}</th>
  );
  const TD = ({ children, color=C.text, mono=false }) => (
    <td style={{ padding:"9px 12px", fontSize:11, color,
      fontFamily: mono?"'IBM Plex Mono',monospace":"'Barlow',sans-serif",
      borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{children}</td>
  );

  return (
    <div style={{ padding:20 }}>

      {/* ══ VOICE ENROLLMENT MODAL ══ */}
      {showEnrollment && (
        <div style={{
          position:"fixed", inset:0, background:"#000000CC", zIndex:9800,
          display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={()=>{ if(enrollStep==="idle") setShowEnrollment(false); }}>
          <div style={{
            background:C.card, border:`1px solid ${C.borderHi}`,
            borderRadius:16, padding:32, width:380, maxWidth:"90vw",
            boxShadow:`0 12px 80px #000C`,
          }} onClick={e=>e.stopPropagation()}>

            {/* Header */}
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24}}>
              <div>
                <div style={{fontSize:13, fontWeight:800, color:C.orange,
                  fontFamily:"'IBM Plex Mono',monospace", letterSpacing:2}}>
                  🎙️ VOICE ENROLLMENT
                </div>
                <div style={{fontSize:11, color:C.textMid, marginTop:4}}>
                  Register staff voices for automatic recognition
                </div>
              </div>
              <button onClick={()=>setShowEnrollment(false)}
                style={{background:"none", border:"none", color:C.textMid,
                  fontSize:20, cursor:"pointer", padding:4}}>✕</button>
            </div>

            {/* Staff list */}
            {!enrollingStaff ? (
              <div>
                <div style={{fontSize:11, color:C.textDim, marginBottom:12,
                  fontFamily:"'IBM Plex Mono',monospace"}}>
                  SELECT STAFF TO ENROLL — {restaurant.name}
                </div>
                {(STAFF_DB[restaurant.id]||[]).map(staff => {
                  const enrolled = !!voiceProfiles[staff.id];
                  return (
                    <div key={staff.id} style={{
                      display:"flex", alignItems:"center",
                      padding:"12px 14px", marginBottom:8, borderRadius:8,
                      background:C.surface, border:`1px solid ${enrolled?C.green:C.border}`,
                      cursor:"pointer",
                    }} onClick={()=>startEnrollment(staff)}>
                      <div style={{
                        width:36, height:36, borderRadius:"50%",
                        background:staff.color+"33", border:`2px solid ${staff.color}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:11, fontWeight:800, color:staff.color, marginRight:12,
                        fontFamily:"'IBM Plex Mono',monospace",
                      }}>{staff.initials}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700, color:C.text, fontSize:14}}>{staff.name}</div>
                        <div style={{fontSize:11, color:C.textMid}}>{staff.role}</div>
                      </div>
                      <div style={{
                        fontSize:10, fontWeight:800, letterSpacing:1,
                        padding:"3px 8px", borderRadius:4,
                        background: enrolled ? `${C.green}22` : `${C.border}`,
                        color: enrolled ? C.green : C.textDim,
                        fontFamily:"'IBM Plex Mono',monospace",
                      }}>
                        {enrolled ? "● ENROLLED" : "○ NOT SET"}
                      </div>
                    </div>
                  );
                })}
                <div style={{fontSize:10, color:C.textDim, marginTop:16,
                  fontFamily:"'IBM Plex Mono',monospace", textAlign:"center"}}>
                  Each person speaks naturally for 10 seconds while recording
                </div>
              </div>
            ) : (
              /* Enrollment recording UI */
              <div style={{textAlign:"center"}}>
                <div style={{
                  width:80, height:80, borderRadius:"50%", margin:"0 auto 20px",
                  background:`${enrollingStaff.color}22`,
                  border:`3px solid ${enrollingStaff.color}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, fontWeight:800, color:enrollingStaff.color,
                  fontFamily:"'IBM Plex Mono',monospace",
                  boxShadow: enrollStep==="recording" ? `0 0 30px ${enrollingStaff.color}66` : "none",
                  animation: enrollStep==="recording" ? "pulse 1s infinite" : "none",
                }}>{enrollingStaff.initials}</div>

                <div style={{fontSize:16, fontWeight:800, color:C.text, marginBottom:8}}>
                  {enrollingStaff.name}
                </div>

                {enrollStep === "recording" && (
                  <>
                    <div style={{
                      fontSize:48, fontWeight:900, color:C.orange,
                      fontFamily:"'IBM Plex Mono',monospace", lineHeight:1,
                    }}>{enrollCountdown}</div>
                    <div style={{fontSize:13, color:C.textMid, margin:"12px 0 20px"}}>
                      Speak naturally — say your name, today's orders, anything
                    </div>
                    <div style={{
                      fontSize:11, color:C.orange, fontFamily:"'IBM Plex Mono',monospace",
                      padding:"8px 16px", border:`1px solid ${C.orange}`,
                      borderRadius:6, display:"inline-block",
                      animation:"pulse 0.8s infinite",
                    }}>● RECORDING</div>
                  </>
                )}

                {enrollStep === "processing" && (
                  <div style={{color:C.textMid, fontSize:13}}>Processing voice sample…</div>
                )}

                {enrollStep === "done" && (
                  <div style={{color:C.green, fontSize:15, fontWeight:700}}>
                    ✓ Voice enrolled successfully
                  </div>
                )}

                {enrollStep === "failed" && (
                  <div style={{color:C.danger, fontSize:13}}>
                    ✗ Not enough voice data. Try again in a quieter space.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cancel last command ── */}
      {cancelTarget && (
        <div style={{
          position:"fixed", top:64, left:"50%", transform:"translateX(-50%)",
          zIndex:9500, background:C.card, border:`2px solid ${C.danger}`,
          borderRadius:10, padding:"12px 20px",
          display:"flex", alignItems:"center", gap:16,
          boxShadow:`0 4px 40px ${C.danger}44`,
          minWidth:300,
        }}>
          <div style={{flex:1}}>
            <div style={{fontSize:10, color:C.danger, fontWeight:700,
              fontFamily:"'IBM Plex Mono',monospace", marginBottom:3, letterSpacing:1}}>
              ● JUST LOGGED — CORRECT?
            </div>
            <div style={{fontSize:16, fontWeight:800, color:C.text}}>
              <span style={{color:C.orange}}>{cancelTarget.qty}×</span>{" "}
              {cancelTarget.item}
              <span style={{fontSize:10, color:C.textDim, marginLeft:8}}>
                {cancelTarget.intent}
              </span>
            </div>
          </div>
          <button onClick={async () => {
            setOrders(prev => prev.filter(o => o.id !== cancelTarget.id));
            await dbUpdateOrder(cancelTarget.id, { status:"CANCELLED" });
            TTS.speak("Cancelled.");
            notify("❌ Order cancelled", C.danger);
            setCancelTarget(null);
          }} style={{
            padding:"8px 16px", borderRadius:6, flexShrink:0,
            background:`${C.danger}22`, border:`1px solid ${C.danger}`,
            color:C.danger, fontWeight:800, fontSize:12,
          }}>✕ CANCEL</button>
        </div>
      )}

      {/* Status bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800 }}>🗄️ Backend Database</div>
          <div style={{ fontSize:11, color:C.textDim, marginTop:2, fontFamily:"'IBM Plex Mono',monospace" }}>
            Supabase · PostgreSQL · Real-time · {orders.length} rows
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:C.green,
            boxShadow:`0 0 8px ${C.green}` }} />
          <span style={{ fontSize:11, color:C.green, fontFamily:"'IBM Plex Mono',monospace" }}>CONNECTED</span>
        </div>
      </div>

      {/* Table tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {tables.map(t=>(
          <button key={t.id} onClick={()=>setTable(t.id)} style={{
            padding:"6px 14px", borderRadius:6,
            background: table===t.id ? `${C.orange}22` : C.card,
            border:`1px solid ${table===t.id ? C.orange : C.border}`,
            color: table===t.id ? C.orange : C.textMid,
            fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
            display:"flex", alignItems:"center", gap:8,
          }}>
            📁 {t.label}
            <span style={{
              background: table===t.id ? C.orange : C.border,
              color: table===t.id ? C.bg : C.textDim,
              borderRadius:10, padding:"1px 7px", fontSize:9,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── orders table ── */}
      {table==="orders" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ display:"flex", gap:10, padding:12, borderBottom:`1px solid ${C.border}`,
            background:C.surface, flexWrap:"wrap", alignItems:"center" }}>
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="🔍 Search ID or item…"
              style={{ padding:"7px 12px", borderRadius:6, border:`1px solid ${C.border}`,
                background:C.card, color:C.text, fontSize:12,
                fontFamily:"'IBM Plex Mono',monospace", width:220 }}
            />
            <select value={filterIntent} onChange={e=>setFilterIntent(e.target.value)}
              style={{ padding:"7px 10px", borderRadius:6, border:`1px solid ${C.border}`,
                background:C.card, color:C.text, fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
              <option value="ALL">ALL INTENTS</option>
              {Object.keys(INTENT_PATTERNS).map(i=><option key={i} value={i}>{i}</option>)}
            </select>
            <span style={{ marginLeft:"auto", fontSize:11, color:C.textDim, fontFamily:"'IBM Plex Mono',monospace" }}>
              {filtered.length}/{orders.length} rows
            </span>
          </div>

          {orders.length===0 ? (
            <div style={{ textAlign:"center", padding:60, color:C.textDim }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
              No records yet — activate the voice system and speak a command.
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  <TH>ORDER_ID</TH><TH>INTENT</TH><TH>ITEM</TH><TH minW={40}>QTY</TH>
                  <TH>SPEAKER_ID</TH><TH>SPEAKER</TH><TH>STATUS</TH>
                  <TH>CREATED_AT</TH><TH>ACK_AT</TH><TH>FULFILLED_AT</TH>
                  <TH>ACK_DUR</TH><TH>FULFILL_DUR</TH><TH>OVERRIDE</TH>
                  <TH>RESTAURANT</TH>
                </tr></thead>
                <tbody>
                  {filtered.map((o,i)=>{
                    const s = staff.find(x=>x.id===o.speakerId);
                    const isNew = o.id===latestId;
                    return (
                      <tr key={o.id} className={isNew?"flash-row":""} style={{
                        background: i%2===0 ? C.card : C.surface,
                        borderLeft:`3px solid ${isNew?C.orange:"transparent"}`,
                      }}>
                        <TD color={C.orange} mono>
                          {isNew&&<span style={{color:C.green,marginRight:4}}>●</span>}
                          {o.id}
                        </TD>
                        <td style={{ padding:"9px 12px", borderBottom:`1px solid ${C.border}` }}>
                          <IntentChip intent={o.intent} />
                        </td>
                        <TD>{o.item}</TD>
                        <TD color={C.text}><strong>{o.qty}</strong></TD>
                        <TD color={C.blue} mono>{o.speakerId||"—"}</TD>
                        <TD color={s?.color||C.textMid}>{s?.name||"—"}</TD>
                        <td style={{ padding:"9px 12px", borderBottom:`1px solid ${C.border}` }}>
                          <StatusChip status={o.status} override={o.overrideFlag} />
                        </td>
                        <TD color={C.textMid} mono>{iso(o.timeCreated)}</TD>
                        <TD color={o.timeAck?C.blue:C.textDim} mono>{iso(o.timeAck)}</TD>
                        <TD color={o.timeFulfilled?C.green:C.textDim} mono>{iso(o.timeFulfilled)}</TD>
                        <TD color={C.purple} mono>{dur(o.timeCreated,o.timeAck)}</TD>
                        <TD color={C.purple} mono>{dur(o.timeCreated,o.timeFulfilled)}</TD>
                        <TD color={o.overrideFlag?C.danger:C.textDim} mono>{o.overrideFlag?"TRUE ⚑":"false"}</TD>
                        <TD color={C.textMid} mono>{o.restaurantId}</TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── voice_events ── */}
      {table==="voice_events" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          {voiceEvents.length===0 ? (
            <div style={{ textAlign:"center", padding:60, color:C.textDim }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🎙️</div>No voice events yet.
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  <TH>EVENT_ID</TH><TH>ORDER_REF</TH><TH>SPEAKER_ID</TH>
                  <TH>SPEAKER_NAME</TH><TH>INTENT</TH><TH minW={280}>RAW_TRANSCRIPT</TH>
                  <TH>CONFIDENCE</TH><TH>TIMESTAMP</TH>
                </tr></thead>
                <tbody>
                  {voiceEvents.map((ev,i)=>{
                    const s = staff.find(x=>x.id===ev.speakerId);
                    return (
                      <tr key={ev.id} style={{ background:i%2===0?C.card:C.surface }}>
                        <TD color={C.textDim} mono>EVT-{String(ev.id).slice(-6)}</TD>
                        <TD color={C.orange} mono>{ev.orderId||"—"}</TD>
                        <TD color={C.blue} mono>{ev.speakerId||"—"}</TD>
                        <TD color={s?.color||C.textMid}>{s?.name||"—"}</TD>
                        <td style={{ padding:"9px 12px", borderBottom:`1px solid ${C.border}` }}>
                          {ev.intent ? <IntentChip intent={ev.intent}/> : <span style={{color:C.textDim,fontSize:11}}>—</span>}
                        </td>
                        <TD color={C.text}>"{ev.text}"</TD>
                        <td style={{ padding:"9px 12px", borderBottom:`1px solid ${C.border}` }}>
                          <ConfidenceMeter value={ev.confidence||0} />
                        </td>
                        <TD color={C.textMid} mono>{iso(ev.ts)}</TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── waste_log ── */}
      {table==="waste_log" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          {wasteRows.length===0 ? (
            <div style={{ textAlign:"center", padding:60, color:C.textDim }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🗑️</div>No waste events yet.
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  <TH>WASTE_ID</TH><TH>ORDER_REF</TH><TH>TYPE</TH>
                  <TH>ITEM</TH><TH>QTY_WASTED</TH><TH>REPORTED_BY</TH>
                  <TH>ROLE</TH><TH>LOGGED_AT</TH>
                </tr></thead>
                <tbody>
                  {wasteRows.map((o,i)=>{
                    const s=staff.find(x=>x.id===o.speakerId);
                    return (
                      <tr key={o.id} style={{background:i%2===0?C.card:C.surface}}>
                        <TD color={C.danger} mono>WST-{o.id.slice(-4)}</TD>
                        <TD color={C.orange} mono>{o.id}</TD>
                        <td style={{padding:"9px 12px",borderBottom:`1px solid ${C.border}`}}>
                          <IntentChip intent={o.intent}/>
                        </td>
                        <TD>{o.item}</TD>
                        <TD color={C.danger}><strong>{o.qty}</strong></TD>
                        <TD color={s?.color||C.textMid}>{s?.name||"—"}</TD>
                        <TD color={C.textDim}>{s?.role||"—"}</TD>
                        <TD color={C.textMid} mono>{iso(o.timeCreated)}</TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── override_flags ── */}
      {table==="override_flags" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          {overrideRows.length===0 ? (
            <div style={{ textAlign:"center", padding:60, color:C.textDim }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⚑</div>
              No overrides yet.<br/>
              <span style={{fontSize:11,color:C.textDim,marginTop:8,display:"block"}}>
                Order a quantity significantly above historical average to trigger a predictive alert.
              </span>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  <TH>FLAG_ID</TH><TH>ORDER_REF</TH><TH>ITEM</TH>
                  <TH>QTY_REQUESTED</TH><TH>QTY_PREDICTED</TH><TH>VARIANCE_%</TH>
                  <TH>OVERRIDDEN_BY</TH><TH>ROLE</TH><TH>TIMESTAMP</TH>
                </tr></thead>
                <tbody>
                  {overrideRows.map((o,i)=>{
                    const s=staff.find(x=>x.id===o.speakerId);
                    const predicted=o.predictedQty||getPrediction(o.itemId)||10;
                    const variance=Math.round((o.qty/predicted-1)*100);
                    return (
                      <tr key={o.id} style={{
                        background:i%2===0?`${C.danger}08`:`${C.danger}04`,
                        borderLeft:`3px solid ${C.danger}44`,
                      }}>
                        <TD color={C.danger} mono>OVR-{o.id.slice(-4)}</TD>
                        <TD color={C.orange} mono>{o.id}</TD>
                        <TD>{o.item}</TD>
                        <TD color={C.danger}><strong>{o.qty}</strong></TD>
                        <TD color={C.green}>{predicted}</TD>
                        <TD color={C.amber}><strong>+{variance}%</strong></TD>
                        <TD color={s?.color||C.textMid}>{s?.name||"—"}</TD>
                        <TD color={C.textDim}>{s?.role||"—"}</TD>
                        <TD color={C.textMid} mono>{iso(o.timeCreated)}</TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Schema reference */}
      <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:10 }}>
        {[
          { t:"orders", fields:["id PK","restaurant_id FK","intent","item","item_id","qty","speaker_id FK","status","created_at","ack_at","fulfilled_at","override_flag","predicted_qty","voice_event_id FK"] },
          { t:"voice_events", fields:["id PK","order_ref FK","speaker_id FK","restaurant_id FK","raw_transcript","intent_detected","confidence_score","all_alternatives jsonb","timestamp"] },
          { t:"staff", fields:["id PK","restaurant_id FK","name","role","color","voice_pitch_avg","voice_energy_avg","voice_enrolled_at","is_active"] },
          { t:"override_flags", fields:["id PK","order_ref FK","qty_requested","qty_predicted","variance_pct","staff_id FK","restaurant_id FK","logged_at","reason"] },
          { t:"restaurants", fields:["id PK","name","city","province","store_number","timezone","is_active","created_at"] },
          { t:"predictions", fields:["id PK","restaurant_id FK","item_id","hour_of_day","day_of_week","predicted_qty","confidence","last_updated"] },
        ].map(s=>(
          <div key={s.t} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.orange, fontFamily:"'IBM Plex Mono',monospace", marginBottom:8 }}>
              📁 {s.t}
            </div>
            {s.fields.map(f=>(
              <div key={f} style={{ fontSize:10, color:C.textDim, fontFamily:"'IBM Plex Mono',monospace", padding:"1px 0" }}>
                · {f}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS VIEW
═══════════════════════════════════════════════════════════════ */
function AnalyticsView({ orders, restaurants, currentRestaurant }) {
  const CustomTT = ({ active, payload, label }) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", fontSize:11 }}>
        <div style={{ color:C.textMid, marginBottom:4 }}>{label}</div>
        {payload.map(p=>(
          <div key={p.name} style={{ color:p.color||C.text }}>{p.name}: <strong>{p.value}</strong></div>
        ))}
      </div>
    );
  };

  const fulfilled = orders.filter(o=>o.timeFulfilled);
  const avgFulfill = fulfilled.length
    ? Math.round(fulfilled.reduce((s,o)=>s+(o.timeFulfilled-o.timeCreated)/1000,0)/fulfilled.length)
    : 0;

  const itemFreq = {};
  orders.forEach(o=>{ itemFreq[o.item]=(itemFreq[o.item]||0)+o.qty; });
  const topItems = Object.entries(itemFreq).sort((a,b)=>b[1]-a[1]).slice(0,7)
    .map(([name,count])=>({name:name?.split(" ")[0]||name, count}));

  const kpis = [
    { label:"TOTAL ORDERS", val:orders.filter(o=>o.intent==="ORDER").length, color:C.blue, icon:"📋" },
    { label:"FULFILLED",    val:fulfilled.length, color:C.green, icon:"✅" },
    { label:"WASTE EVENTS", val:orders.filter(o=>["WASTE","DISCARDING"].includes(o.intent)).length, color:C.danger, icon:"🗑️" },
    { label:"OVERRIDES",    val:orders.filter(o=>o.overrideFlag).length, color:C.amber, icon:"⚑" },
    { label:"AVG FULFILL",  val:`${avgFulfill}s`, color:C.purple, icon:"⏱" },
    { label:"EFFICIENCY",   val:"94%", color:C.green, icon:"📈" },
    { label:"RESTAURANTS",  val:restaurants.length, color:C.cyan, icon:"🏪" },
    { label:"ACTIVE STAFF", val:Object.values(STAFF_DB).flat().length, color:C.orange, icon:"👥" },
  ];

  return (
    <div style={{ padding:20 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10, marginBottom:20 }}>
        {kpis.map(k=>(
          <Card key={k.label}>
            <div style={{ fontSize:20, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:24, fontWeight:900, color:k.color, fontFamily:"'IBM Plex Mono',monospace" }}>{k.val}</div>
            <div style={{ fontSize:9, color:C.textDim, letterSpacing:1.5, marginTop:4 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Hourly demand */}
      <Card style={{ marginBottom:16 }}>
        <SectionLabel>HOURLY DEMAND — HASHBROWNS (PREDICTED vs ACTUAL)</SectionLabel>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={hourlyData}>
            <defs>
              <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.blue} stopOpacity={.25}/>
                <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.orange} stopOpacity={.25}/>
                <stop offset="95%" stopColor={C.orange} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="hour" tick={{fill:C.textDim,fontSize:10}}/>
            <YAxis tick={{fill:C.textDim,fontSize:10}}/>
            <Tooltip content={<CustomTT/>}/>
            <Legend wrapperStyle={{fontSize:11,color:C.textMid}}/>
            <Area type="monotone" dataKey="predicted" stroke={C.blue} fill="url(#gPred)" strokeWidth={2} name="Predicted"/>
            <Area type="monotone" dataKey="actual"    stroke={C.orange} fill="url(#gAct)" strokeWidth={2} name="Actual"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* 7-day */}
        <Card>
          <SectionLabel>7-DAY PERFORMANCE</SectionLabel>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="day" tick={{fill:C.textDim,fontSize:10}}/>
              <YAxis tick={{fill:C.textDim,fontSize:10}}/>
              <Tooltip content={<CustomTT/>}/>
              <Legend wrapperStyle={{fontSize:11,color:C.textMid}}/>
              <Bar dataKey="orders" fill={C.blue}   radius={[3,3,0,0]} name="Orders"/>
              <Bar dataKey="waste"  fill={C.danger} radius={[3,3,0,0]} name="Waste"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top items */}
        <Card>
          <SectionLabel>TOP ITEMS</SectionLabel>
          {topItems.length===0 ? (
            <div style={{color:C.textDim,fontSize:12,padding:16}}>No item data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis type="number" tick={{fill:C.textDim,fontSize:10}}/>
                <YAxis dataKey="name" type="category" tick={{fill:C.textMid,fontSize:10}} width={72}/>
                <Tooltip content={<CustomTT/>}/>
                <Bar dataKey="count" fill={C.orange} radius={[0,3,3,0]} name="Units"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Multi-restaurant comparison */}
      <Card>
        <SectionLabel>FRANCHISE OVERVIEW</SectionLabel>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
          {restaurants.map(r=>{
            const rOrders = orders.filter(o=>o.restaurantId===r.id);
            const isActive = r.id===currentRestaurant.id;
            return (
              <div key={r.id} style={{
                background:C.surface, borderRadius:6, padding:14,
                border:`1px solid ${isActive?C.orange:C.border}`,
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:isActive?C.orange:C.text }}>{r.name}</span>
                  {isActive&&<span style={{ fontSize:9, color:C.green, fontFamily:"'IBM Plex Mono',monospace" }}>● ACTIVE</span>}
                </div>
                <div style={{ fontSize:10, color:C.textDim, marginBottom:8 }}>{r.city} · #{r.storeNum}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div style={{ background:C.card, borderRadius:4, padding:"6px 8px" }}>
                    <div style={{ fontSize:9, color:C.textDim }}>ORDERS</div>
                    <div style={{ fontSize:16, fontWeight:800, color:C.blue, fontFamily:"'IBM Plex Mono',monospace" }}>
                      {rOrders.filter(o=>o.intent==="ORDER").length}
                    </div>
                  </div>
                  <div style={{ background:C.card, borderRadius:4, padding:"6px 8px" }}>
                    <div style={{ fontSize:9, color:C.textDim }}>WASTE</div>
                    <div style={{ fontSize:16, fontWeight:800, color:C.danger, fontFamily:"'IBM Plex Mono',monospace" }}>
                      {rOrders.filter(o=>["WASTE","DISCARDING"].includes(o.intent)).length}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREDICTIVE ALERT MODAL
═══════════════════════════════════════════════════════════════ */
function PredictiveAlert({ alert, onConfirm, onOverride }) {
  if (!alert) return null;
  return (
    <div style={{
      position:"fixed", inset:0, background:"#000000BB",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:9000, backdropFilter:"blur(6px)",
    }}>
      <div style={{
        background:C.card, border:`2px solid ${C.amber}`,
        borderRadius:12, padding:32, maxWidth:440, width:"92%",
        boxShadow:`0 0 80px ${C.amber}33`,
        animation:"fadeUp .3s ease",
      }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:18, fontWeight:900, color:C.amber, marginBottom:10 }}>
          PREDICTIVE ALERT
        </div>
        <p style={{ fontSize:14, color:C.text, lineHeight:1.7, marginBottom:16 }}>
          Based on <strong style={{color:C.orange}}>historical data</strong> for this time window,
          you typically need only <strong style={{color:C.green}}>{alert.predicted} {alert.item}</strong> between{" "}
          <strong style={{color:C.amber}}>{alert.window}</strong>.
        </p>
        <div style={{ background:C.surface, borderRadius:6, padding:14, marginBottom:20,
          fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:C.textMid,
          border:`1px solid ${C.border}`, lineHeight:2 }}>
          <div>📊 Historical avg:  <span style={{color:C.green}}>{alert.predicted}</span></div>
          <div>📋 Requested:       <span style={{color:C.amber}}>{alert.requested}</span></div>
          <div>⬆️ Over by:         <span style={{color:C.danger}}>+{alert.requested-alert.predicted} units (+{Math.round((alert.requested/alert.predicted-1)*100)}%)</span></div>
        </div>
        <p style={{ fontSize:14, color:C.text, fontWeight:600, marginBottom:20 }}>
          Are you sure you want to order{" "}
          <strong style={{color:C.danger}}>{alert.requested}</strong> {alert.item}?
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onConfirm} style={{
            flex:1, padding:"11px 0", borderRadius:6,
            background:`${C.green}22`, border:`1px solid ${C.green}`,
            color:C.green, fontWeight:800, fontSize:12, letterSpacing:1,
          }}>✓ USE {alert.predicted}</button>
          <button onClick={onOverride} style={{
            flex:1, padding:"11px 0", borderRadius:6,
            background:`${C.danger}22`, border:`1px solid ${C.danger}`,
            color:C.danger, fontWeight:800, fontSize:12, letterSpacing:1,
          }}>⚑ OVERRIDE — KEEP {alert.requested}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [restaurant, setRestaurant] = useState(RESTAURANTS[0]);
  const staff = STAFF_DB[restaurant.id] || [];

  // Voice state
  const [voiceState, setVoiceState] = useState("idle"); // idle|awake|processing
  const [interim, setInterim]       = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [voiceEnabled, setVoiceEnabled]     = useState(false);
  const awakeTimerRef = useRef(null);

  // Data
  const [orders, setOrders]           = useState([]);
  const [voiceEvents, setVoiceEvents] = useState([]);

  // UI
  const [view, setView]               = useState("command");
  const [predictiveAlert, setPredictiveAlert] = useState(null);
  const [pendingCmd, setPendingCmd]   = useState(null);
  const [toast, setToast]             = useState(null);
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [cancelTarget, setCancelTarget]     = useState(null);
  const [showVoiceTuner, setShowVoiceTuner] = useState(false);
  const [voiceRate, setVoiceRateState]       = useState(0.92);
  const [voicePitch, setVoicePitchState]     = useState(1.0);

  // Voice enrollment
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [enrollingStaff, setEnrollingStaff] = useState(null);  // staff object being enrolled
  const [enrollStep, setEnrollStep]          = useState("idle"); // idle|recording|processing|done
  const [enrollCountdown, setEnrollCountdown]= useState(10);
  const [voiceProfiles, setVoiceProfiles]    = useState({});   // {staffId: features}
  const enrollPitchBuf  = useRef([]);
  const enrollEnergyBuf = useRef([]);
  const enrollTimerRef  = useRef(null);

  // Live speaker identity (updated per utterance)
  const [liveSpeaker, setLiveSpeaker]        = useState(null); // {id, name, confidence}
  const livePitchBuf  = useRef([]);
  const liveEnergyBuf = useRef([]);

  // ── Notifications ──
  const notify = useCallback((msg, color=C.green) => {
    setToast({ msg, color });
    setTimeout(()=>setToast(null), 3200);
  }, []);

  // ── Load from Supabase + real-time subscription ──
  // Load voice profiles per location on mount
  useEffect(() => {
    const staff = STAFF_DB[restaurant.id] || [];
    loadVoiceProfiles(restaurant.id, staff).then(profiles => {
      if (Object.keys(profiles).length) setVoiceProfiles(profiles);
    });
  }, [restaurant.id]);

  useEffect(() => {
    let channel;
    (async () => {
      const loaded = await dbLoadOrders(restaurant.id);
      setOrders(loaded);
      channel = await dbSubscribeOrders(restaurant.id, (payload) => {
        const r = payload.new;
        if (!r) return;
        const order = {
          id: r.id, restaurantId: r.restaurant_id,
          intent: r.intent, item: r.item, itemId: r.item_id,
          qty: r.qty, speakerId: r.speaker_id, status: r.status,
          overrideFlag: r.override_flag, predictedQty: r.predicted_qty,
          timeCreated: r.time_created, timeAck: r.time_ack,
          timeFulfilled: r.time_fulfilled,
        };
        if (payload.eventType === 'INSERT')
          setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
        else if (payload.eventType === 'UPDATE')
          setOrders(prev => prev.map(o => o.id === order.id ? order : o));
      });
    })();
    return () => { try { channel?.unsubscribe(); } catch {} };
  }, [restaurant.id]);

  // ── Create order ──
  const createOrder = useCallback(async (cmd, speakerId, overrideFlag=false, predictedQty=null) => {
    const id = genId(restaurant.id);
    const order = {
      id,
      restaurantId: restaurant.id,
      intent:       cmd.intent,
      item:         cmd.item,
      itemId:       cmd.itemId,
      qty:          cmd.qty,
      speakerId,
      status:       "PENDING",
      overrideFlag,
      predictedQty,
      timeCreated:  Date.now(),
      timeAck:      null,
      timeFulfilled:null,
    };
    setOrders(prev=>[order,...prev]);
    await dbInsertOrder(order);
    if (overrideFlag) await dbInsertOverrideFlag(order);

    if (cmd.intent==="ORDER")
      notify(`🔔 Order ${id} — ${cmd.qty}× ${cmd.item} → Kitchen!`, C.blue);
    else if (["WASTE","DISCARDING"].includes(cmd.intent))
      notify(`🗑️ ${cmd.qty}× ${cmd.item} logged as ${cmd.intent.toLowerCase()}`, C.danger);
    else
      notify(`✓ ${cmd.intent} — ${cmd.qty}× ${cmd.item}`, C.green);

    // 6-second cancel window after every command
    setCancelTarget({ id, item:cmd.item, qty:cmd.qty, intent:cmd.intent });
    setTimeout(() => setCancelTarget(null), 6000);

    return id;
  }, [restaurant.id, notify]);

  // ── Voice enrollment: record 10s, extract features, save ──
  const startEnrollment = useCallback(async (staffMember) => {
    setEnrollingStaff(staffMember);
    setEnrollStep("recording");
    setEnrollCountdown(10);
    enrollPitchBuf.current  = [];
    enrollEnergyBuf.current = [];

    // Use Web Audio to capture pitch during enrollment
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx    = new (window.AudioContext || window.webkitAudioContext)();
      const src    = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);

      let count = 10;
      const tick = setInterval(() => {
        const { pitch, energy } = detectPitch(analyser);
        if (pitch > 50) enrollPitchBuf.current.push(pitch);
        enrollEnergyBuf.current.push(energy);

        count--;
        setEnrollCountdown(count);

        if (count <= 0) {
          clearInterval(tick);
          stream.getTracks().forEach(t => t.stop());
          ctx.close();

          setEnrollStep("processing");
          const features = extractVoiceFeatures(enrollPitchBuf.current, enrollEnergyBuf.current);
          if (features && features.sampleCount >= 5) {
            saveVoiceProfile(restaurant.id, staffMember.id, features).then(() => {
              setVoiceProfiles(prev => ({ ...prev, [staffMember.id]: features }));
              setEnrollStep("done");
              TTS.speak(`Voice enrolled. ${staffMember.name.split(' ')[0]} registered.`);
              setTimeout(() => {
                setEnrollStep("idle");
                setEnrollingStaff(null);
              }, 2500);
            });
          } else {
            setEnrollStep("failed");
            TTS.speak("Enrollment failed. Please try again in a quieter environment.");
            setTimeout(() => setEnrollStep("idle"), 3000);
          }
        }
      }, 1000);

      enrollTimerRef.current = tick;
    } catch(e) {
      setEnrollStep("error");
      notify("Microphone access required for enrollment", C.danger);
      setTimeout(() => setEnrollStep("idle"), 2500);
    }
  }, [restaurant.id, notify]);

  // ── Process transcript ──
  // ── Identify speaker from live audio buffers ──
  const identifyCurrentSpeaker = useCallback(() => {
    const staff = STAFF_DB[restaurant.id] || [];
    if (!staff.length || !Object.keys(voiceProfiles).length) return null;
    const result = identifySpeaker(livePitchBuf.current, liveEnergyBuf.current, voiceProfiles, staff);
    livePitchBuf.current  = [];
    liveEnergyBuf.current = [];
    if (result.id) {
      setLiveSpeaker(result);
      return result;
    }
    return null;
  }, [restaurant.id, voiceProfiles]);

  const processTranscript = useCallback(async (text, confidence) => {
    setInterim("");

    // ── Wake word detection ──
    if (voiceState !== "awake") {
      const cleanText = denoiseTranscript(text);
    if (/\b(hey\s*tim+[msyz]?|hey\s*timmy|timmy|timmie|timms|tims|tim\s*horton[s]?|yo\s*tim|hi\s*tim)\b/i.test(cleanText)) {
        setVoiceState("awake");
        notify("🎙️ Listening…", C.orange);
        TTS.speak(buildWakeResponse());
        clearTimeout(awakeTimerRef.current);
        awakeTimerRef.current = setTimeout(()=>setVoiceState("idle"), 30000);
      }
      return;
    }

    // ── Identify who is speaking ──
    const speaker = identifyCurrentSpeaker();
    const speakerName = speaker?.name || liveSpeaker?.name || null;
    const speakerId   = speaker?.id   || liveSpeaker?.id   || (STAFF_DB[restaurant.id]?.[0]?.id);

    const cmd = parseCommand(text);

    // Log voice event
    const ev = {
      id:          Date.now(),
      text,
      confidence:  confidence || 0.85,
      intent:      cmd.intent,
      item:        cmd.item,
      qty:         cmd.qty,
      speakerId,
      speakerName,
      restaurantId: restaurant.id,
      ts:           Date.now(),
      orderId:      null,
    };

    // ── CLOSE ORDER command — "close order 12" ──
    if (cmd.intent === "CLOSE") {
      if (!cmd.closeRef) {
        TTS.speak(buildConfusionResponse("close"));
        notify("❓ Which order number to close?", C.amber);
        setVoiceEvents(prev => [{ ...ev, intent:"CONFUSION" }, ...prev]);
        setVoiceState("awake");
        return;
      }
      // Find the open order
      const targetOrder = orders.find(o =>
        o.id === cmd.closeRef && ["PENDING","ACKNOWLEDGED"].includes(o.status)
      );
      if (!targetOrder) {
        TTS.speak(`Order ${cmd.closeRef} not found or already closed.`);
        notify(`⚠️ Order ${cmd.closeRef} not found`, C.amber);
        setVoiceState("awake");
        return;
      }
      // Close it
      const updated = { ...targetOrder, status:"FULFILLED", timeFulfilled: Date.now() };
      setOrders(prev => prev.map(o => o.id === cmd.closeRef ? updated : o));
      await dbUpdateOrder(cmd.closeRef, { status:"FULFILLED", timeFulfilled: Date.now() });
      freeOrderNum(cmd.closeRef);
      setVoiceEvents(prev => [{ ...ev, orderId: cmd.closeRef }, ...prev]);
      TTS.speak(buildCloseResponse(cmd.closeRef, targetOrder.item, targetOrder.qty, speakerName));
      notify(`✅ Order ${cmd.closeRef} fulfilled`, C.green);
      setVoiceState("awake");
      return;
    }

    // ── Confusion: unclear quantity ──
    if (cmd.qtyUnclear && cmd.intent === "ORDER") {
      TTS.speak(buildConfusionResponse("qty"));
      notify("❓ Quantity unclear — please repeat", C.amber);
      setVoiceEvents(prev => [{ ...ev, intent:"CONFUSION" }, ...prev]);
      setVoiceState("awake");
      return;
    }

    // ── Confusion: item not in store directory ──
    if (cmd.itemNotFound) {
      TTS.speak(buildNotFoundResponse());
      notify(`❌ Item not in store directory`, C.danger);
      setVoiceEvents(prev => [{ ...ev, intent:"UNKNOWN" }, ...prev]);
      setVoiceState("awake");
      return;
    }

    // ── Confusion: item heard but weak match ──
    if (cmd.itemUnclear) {
      TTS.speak(`Did you mean ${cmd.item}? Please confirm or repeat.`);
      notify(`❓ Did you mean ${cmd.item}?`, C.amber);
      setVoiceEvents(prev => [{ ...ev, intent:"CONFIRM?" }, ...prev]);
      setVoiceState("awake");
      return;
    }

    // ── No intent or no item — ignore silently (background noise) ──
    if (!cmd.intent || !cmd.item) {
      setVoiceEvents(prev => [ev, ...prev]);
      return;
    }

    setVoiceState("processing");
    clearTimeout(awakeTimerRef.current);
    awakeTimerRef.current = setTimeout(()=>setVoiceState("idle"), 30000);

    // ── Predictive check for ORDER ──
    if (cmd.intent === "ORDER") {
      const predicted = getPrediction(cmd.itemId);
      const hour = new Date().getHours();
      if (cmd.qty > predicted * 1.4 && predicted > 2) {
        setPendingCmd({ cmd, speakerId, ev, predicted });
        setPredictiveAlert({
          item: cmd.item, requested: cmd.qty, predicted,
          window: `${hour}:00–${hour+1}:00`,
        });
        setVoiceState("awake");
        return;
      }
    }

    // ── Create the order ──
    const orderId = await createOrder(cmd, speakerId);
    ev.orderId = orderId;
    setVoiceEvents(prev => [ev, ...prev]);
    await dbInsertVoiceEvent(ev);

    // ── Speak confirmation with name ──
    TTS.speak(buildVoiceResponse(cmd.intent, cmd.item, cmd.qty, orderId, speakerName));
    setVoiceState("awake");
  }, [voiceState, restaurant.id, createOrder, notify, orders, voiceProfiles,
      liveSpeaker, identifyCurrentSpeaker]);

  // ── Speech engine ──
  // ── Continuous audio analyser — runs when voice is enabled ──
  // Collects pitch/energy samples into livePitchBuf for speaker ID
  const audioCtxRef    = useRef(null);
  const audioStreamRef = useRef(null);

  useEffect(() => {
    if (!voiceEnabled) {
      // Stop analyser when voice is off
      audioStreamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close().catch(()=>{});
      audioCtxRef.current = null;
      return;
    }

    let animId;
    let analyser;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        audioStreamRef.current = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        src.connect(analyser);

        const loop = () => {
          animId = requestAnimationFrame(loop);
          const { pitch, energy } = detectPitch(analyser);
          if (pitch > 50 && energy > 0.01) {
            livePitchBuf.current.push(pitch);
          }
          liveEnergyBuf.current.push(energy);
          // Keep last 4 seconds (~120 frames at 30fps)
          if (livePitchBuf.current.length  > 120) livePitchBuf.current.shift();
          if (liveEnergyBuf.current.length > 120) liveEnergyBuf.current.shift();
        };
        loop();
      })
      .catch(() => {}); // Mic denied — silent fail, speaker ID won't work

    return () => {
      cancelAnimationFrame(animId);
      audioStreamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close().catch(()=>{});
    };
  }, [voiceEnabled]);

  const { supported, permission } = useSpeechEngine({
    onInterim:  useCallback((text)=>{ if(voiceState==="awake") setInterim(text); }, [voiceState]),
    onFinal:    useCallback((text, conf)=>processTranscript(text, conf, currentSpeaker?.id), [processTranscript, currentSpeaker]),
    enabled:    voiceEnabled,
  });

  // ── Manual command ──
  const onManualCommand = useCallback((text) => {
    if (voiceState==="idle") setVoiceState("awake");
    processTranscript(text, 1.0, currentSpeaker?.id);
  }, [voiceState, processTranscript, currentSpeaker]);

  // ── Order actions ──
  const ackOrder = useCallback(async (id) => {
    setOrders(prev=>prev.map(o=>{
      if (o.id!==id) return o;
      const updated = {...o, status:"ACKNOWLEDGED", timeAck:Date.now()};
      dbUpdateOrder(id, { status: 'ACKNOWLEDGED', time_ack: Date.now() });
      return updated;
    }));
    notify(`✓ Order ${id} acknowledged`, C.blue);
  }, [notify]);

  const fulfillOrder = useCallback(async (id) => {
    setOrders(prev=>prev.map(o=>{
      if (o.id!==id) return o;
      const updated = {...o, status:"FULFILLED", timeFulfilled:Date.now()};
      dbUpdateOrder(id, { status: 'FULFILLED', time_fulfilled: Date.now() });
      return updated;
    }));
    notify(`✅ Order ${id} fulfilled!`, C.green);
    setTimeout(()=>{
      setOrders(prev=>prev.map(o=>{
        if (o.id!==id) return o;
        const updated = {...o, status:"CLOSED"};
        dbUpdateOrder(id, { status: 'CLOSED' });
        return updated;
      }));
    }, 8000);
  }, [notify]);

  // ── Predictive alert handlers ──
  const handleAlertConfirm = useCallback(async () => {
    if (!pendingCmd) return;
    const { cmd, speakerId, ev, predicted } = pendingCmd;
    const adjusted = { ...cmd, qty: predicted };
    const orderId = await createOrder(adjusted, speakerId, false, predicted);
    setVoiceEvents(prev=>[{...ev, orderId},...prev]);
    notify(`✓ Adjusted to ${predicted} units`, C.green);
    TTS.speak(`Order confirmed. Adjusted to ${predicted} ${adjusted.item}.`);
    setPredictiveAlert(null); setPendingCmd(null);
  }, [pendingCmd, createOrder, notify]);

  const handleAlertOverride = useCallback(async () => {
    if (!pendingCmd) return;
    const { cmd, speakerId, ev, predicted } = pendingCmd;
    const orderId = await createOrder(cmd, speakerId, true, predicted);
    setVoiceEvents(prev=>[{...ev, orderId},...prev]);
    notify(`⚑ Override logged — ${cmd.qty} units`, C.amber);
    TTS.speak(`Override logged. ${cmd.qty} ${cmd.item} ordered. Flagged for review.`);
    setPredictiveAlert(null); setPendingCmd(null);
  }, [pendingCmd, createOrder, notify]);

  // ── Enrich voice events with staff ──
  const enrichedEvents = useMemo(()=>
    voiceEvents.map(ev=>({
      ...ev,
      staff: staff.find(s=>s.id===ev.speakerId)||null,
    })),
  [voiceEvents, staff]);

  const activeOrders = orders.filter(o=>["PENDING","ACKNOWLEDGED"].includes(o.status));

  const TABS = [
    { id:"command",   label:"🎙️ COMMAND",   badge:null },
    { id:"orders",    label:"📋 ORDERS",     badge:activeOrders.length||null },
    { id:"kitchen",   label:"👨‍🍳 KITCHEN",   badge:activeOrders.filter(o=>o.intent==="ORDER").length||null },
    { id:"database",  label:"🗄️ DATABASE",   badge:orders.length||null },
    { id:"analytics", label:"📊 ANALYTICS",  badge:null },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text }}>
      <style>{css}</style>
      {toast && <Toast msg={toast.msg} color={toast.color}/>}
      <PredictiveAlert
        alert={predictiveAlert}
        onConfirm={handleAlertConfirm}
        onOverride={handleAlertOverride}
      />

      {/* ── Restaurant picker ── */}
      {showRestPicker && (
        <div style={{
          position:"fixed", inset:0, background:"#000000AA", zIndex:8000,
          display:"flex", alignItems:"center", justifyContent:"center",
          backdropFilter:"blur(4px)",
        }} onClick={()=>setShowRestPicker(false)}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10,
            padding:24, minWidth:340 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:14, fontWeight:800, marginBottom:16 }}>Select Restaurant</div>
            {RESTAURANTS.map(r=>(
              <div key={r.id} onClick={()=>{ setRestaurant(r); setOrders([]); setShowRestPicker(false); }}
                style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"12px 14px", borderRadius:6, cursor:"pointer", marginBottom:6,
                  background: r.id===restaurant.id ? `${C.orange}18` : C.surface,
                  border:`1px solid ${r.id===restaurant.id ? C.orange : C.border}`,
                  transition:"all .15s ease",
                }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:r.id===restaurant.id?C.orange:C.text }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize:11, color:C.textDim }}>{r.city} · #{r.storeNum}</div>
                </div>
                {r.id===restaurant.id && <span style={{ color:C.green, fontSize:16 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"0 20px", display:"flex", alignItems:"center",
        justifyContent:"space-between", height:56,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:38, height:38, borderRadius:8, background:C.red,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, fontWeight:900, color:"#fff",
          }}>☕</div>
          <div>
            <div style={{ fontSize:14, fontWeight:900, letterSpacing:1.5 }}>TIM HORTONS</div>
            <div style={{ fontSize:9, color:C.textDim, letterSpacing:2,
              fontFamily:"'IBM Plex Mono',monospace" }}>VOICE COMMAND SYSTEM</div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Restaurant switcher */}
          <button onClick={()=>setShowRestPicker(true)} style={{
            display:"flex", alignItems:"center", gap:8, padding:"6px 12px",
            borderRadius:6, background:C.card, border:`1px solid ${C.border}`,
            color:C.text, fontSize:12, transition:"border-color .15s ease",
          }}>
            <span>🏪</span>
            <span style={{ fontWeight:600 }}>{restaurant.name}</span>
            <span style={{ color:C.textDim, fontSize:10 }}>▼</span>
          </button>

          {/* Voice toggle */}
          {supported ? (
            <button onClick={()=>setVoiceEnabled(v=>!v)} style={{
              display:"flex", alignItems:"center", gap:6, padding:"6px 14px",
              borderRadius:20, fontWeight:700, fontSize:11, letterSpacing:1,
              background: voiceEnabled ? `${C.green}22` : `${C.orange}22`,
              border: `1px solid ${voiceEnabled ? C.green : C.orange}`,
              color: voiceEnabled ? C.green : C.orange,
              transition:"all .2s ease",
            }}>
              <div style={{ width:6, height:6, borderRadius:"50%",
                background: voiceEnabled ? C.green : C.orange,
                boxShadow: voiceEnabled ? `0 0 6px ${C.green}` : "none",
                animation: voiceEnabled ? "breathe 2s infinite" : "none",
              }} />
              {voiceEnabled ? "MIC ON" : "MIC OFF"}
            </button>
          ) : (
            <span style={{ fontSize:11, color:C.danger, fontFamily:"'IBM Plex Mono',monospace" }}>
              ⚠ Voice: Chrome/Edge only
            </span>
          )}

          {permission==="denied" && (
            <span style={{ fontSize:11, color:C.danger }}>🔒 Mic blocked</span>
          )}
        </div>
      </div>

      {/* ── Nav ── */}
      <div style={{
        background:C.surface, borderBottom:`1px solid ${C.border}`,
        display:"flex", padding:"0 16px", overflowX:"auto",
      }}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setView(tab.id)} style={{
            padding:"12px 18px", background:"none", border:"none",
            borderBottom:`2px solid ${view===tab.id?C.orange:"transparent"}`,
            color: view===tab.id ? C.orange : C.textMid,
            fontWeight: view===tab.id ? 800 : 500,
            fontSize:12, letterSpacing:.8, cursor:"pointer",
            whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:8,
            transition:"color .15s ease",
          }}>
            {tab.label}
            {tab.badge!=null && (
              <span style={{
                background:C.orange, color:C.bg,
                borderRadius:"50%", minWidth:18, height:18,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:10, fontWeight:900,
              }}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Browser support banner ── */}
      {!supported && (
        <div style={{ background:"#450A0A", borderBottom:`1px solid ${C.danger}`,
          padding:"8px 20px", fontSize:12, color:"#F87171",
          display:"flex", alignItems:"center", gap:8 }}>
          <span>⚠️</span>
          <span>
            <strong>Voice recognition requires Chrome or Edge.</strong>
            {" "}You can still use the manual text input below to test all features.
          </span>
        </div>
      )}

      {/* ── Views ── */}
      <div style={{ height:"calc(100vh - 108px)", overflowY:"auto" }}>
        {view==="command" && (
          <CommandView
            voiceState={voiceState}
            interim={interim}
            recentEvents={enrichedEvents}
            staff={staff}
            currentSpeaker={currentSpeaker}
            setCurrentSpeaker={setCurrentSpeaker}
            onManualCommand={onManualCommand}
            liveSpeaker={liveSpeaker}
          />
        )}
        {view==="orders" && (
          <OrdersView orders={orders} staff={staff} onAck={ackOrder} onFulfill={fulfillOrder}/>
        )}
        {view==="kitchen" && (
          <KitchenView orders={orders} staff={staff} onAck={ackOrder} onFulfill={fulfillOrder}/>
        )}
        {view==="database" && (
          <DatabaseView orders={orders} voiceEvents={voiceEvents} staff={staff}/>
        )}
        {view==="analytics" && (
          <AnalyticsView orders={orders} restaurants={RESTAURANTS} currentRestaurant={restaurant}/>
        )}
      </div>

      {/* ── Status bar ── */}
      {/* ── Voice Tuner Modal ── */}
      {showVoiceTuner && (
        <div style={{
          position:"fixed", inset:0, background:"#000B", zIndex:9900,
          display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={()=>setShowVoiceTuner(false)}>
          <div style={{
            background:C.card, border:`1px solid ${C.borderHi}`,
            borderRadius:14, padding:28, width:340,
            boxShadow:`0 8px 60px #000A`,
          }} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:13, fontWeight:800, color:C.orange,
              letterSpacing:2, fontFamily:"'IBM Plex Mono',monospace", marginBottom:18}}>
              🎙️ VOICE TUNER
            </div>

            {/* Active voice name */}
            <div style={{fontSize:11, color:C.textMid, marginBottom:20,
              padding:"8px 12px", background:C.surface, borderRadius:6,
              fontFamily:"'IBM Plex Mono',monospace"}}>
              Voice: <span style={{color:C.cyan}}>{TTS.getVoiceName()}</span>
            </div>

            {/* Rate slider */}
            <div style={{marginBottom:20}}>
              <div style={{display:"flex", justifyContent:"space-between",
                fontSize:11, color:C.textMid, marginBottom:8}}>
                <span style={{fontWeight:700, color:C.text}}>SPEED</span>
                <span style={{color:C.orange, fontFamily:"'IBM Plex Mono',monospace"}}>
                  {voiceRate.toFixed(2)}x {voiceRate <= 0.85 ? "(Slow)" : voiceRate <= 0.95 ? "(VAPI)" : voiceRate <= 1.05 ? "(Normal)" : "(Fast)"}
                </span>
              </div>
              <input type="range" min="0.6" max="1.4" step="0.01"
                value={voiceRate}
                onChange={e => {
                  const r = parseFloat(e.target.value);
                  setVoiceRateState(r);
                  TTS.setRate(r);
                }}
                style={{width:"100%", accentColor:C.orange}}
              />
              <div style={{display:"flex", justifyContent:"space-between",
                fontSize:9, color:C.textDim, marginTop:4}}>
                <span>0.6 Slow</span>
                <span style={{color:C.orange}}>◆ 0.92 VAPI</span>
                <span>1.4 Fast</span>
              </div>
            </div>

            {/* Pitch slider */}
            <div style={{marginBottom:24}}>
              <div style={{display:"flex", justifyContent:"space-between",
                fontSize:11, color:C.textMid, marginBottom:8}}>
                <span style={{fontWeight:700, color:C.text}}>PITCH</span>
                <span style={{color:C.cyan, fontFamily:"'IBM Plex Mono',monospace"}}>
                  {voicePitch.toFixed(2)} {voicePitch < 0.95 ? "(Deep)" : voicePitch <= 1.05 ? "(Natural)" : "(High)"}
                </span>
              </div>
              <input type="range" min="0.7" max="1.3" step="0.01"
                value={voicePitch}
                onChange={e => {
                  const p = parseFloat(e.target.value);
                  setVoicePitchState(p);
                  TTS.setPitch(p);
                }}
                style={{width:"100%", accentColor:C.cyan}}
              />
              <div style={{display:"flex", justifyContent:"space-between",
                fontSize:9, color:C.textDim, marginTop:4}}>
                <span>0.7 Deep</span>
                <span style={{color:C.cyan}}>◆ 1.0 VAPI</span>
                <span>1.3 High</span>
              </div>
            </div>

            {/* Test + Reset buttons */}
            <div style={{display:"flex", gap:10}}>
              <button onClick={()=>TTS.speak(buildVoiceResponse("ORDER","Hashbrowns",6))}
                style={{flex:1, padding:"10px 0", borderRadius:7,
                  background:`${C.orange}22`, border:`1px solid ${C.orange}`,
                  color:C.orange, fontWeight:700, fontSize:12, cursor:"pointer"}}>
                ▶ TEST VOICE
              </button>
              <button onClick={()=>{
                setVoiceRateState(0.92); setVoicePitchState(1.0);
                TTS.setRate(0.92); TTS.setPitch(1.0);
              }} style={{flex:1, padding:"10px 0", borderRadius:7,
                background:`${C.border}`, border:`1px solid ${C.borderHi}`,
                color:C.textMid, fontWeight:700, fontSize:12, cursor:"pointer"}}>
                ↺ RESET VAPI
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        position:"fixed", bottom:0, left:0, right:0,
        background:C.surface, borderTop:`1px solid ${C.border}`,
        padding:"5px 20px", display:"flex", gap:16, alignItems:"center",
        fontSize:10, color:C.textDim, fontFamily:"'IBM Plex Mono',monospace",
        zIndex:100,
      }}>
        <span style={{cursor:"pointer"}} onClick={()=>setShowVoiceTuner(true)}>
          #{restaurant.storeNum} {restaurant.city}
        </span>
        <span>·</span>
        <span>ACTIVE: <span style={{color:C.orange}}>{activeOrders.length}</span></span>
        <span>·</span>
        <span>OVERRIDES: <span style={{color:activeOrders.filter(o=>o.overrideFlag).length?C.amber:C.textDim}}>
          {orders.filter(o=>o.overrideFlag).length}
        </span></span>
        <span>·</span>
        <span>WASTE EVENTS: <span style={{color:C.textDim}}>
          {orders.filter(o=>["WASTE","DISCARDING"].includes(o.intent)).length}
        </span></span>
        <span style={{marginLeft:"auto"}}>
          VOICE: <span style={{color:voiceEnabled?C.green:C.textDim}}>
            {voiceEnabled?(voiceState==="awake"?"● AWAKE":"● STANDBY"):"○ OFF"}
          </span>
        </span>
        <span>·</span>
        <span>SUPABASE: <span style={{color:C.green}}>● CONNECTED</span></span>
        <span>·</span>
        <span onClick={()=>setShowVoiceTuner(true)}
          style={{cursor:"pointer", color:C.orange, fontWeight:700,
            padding:"2px 8px", border:`1px solid ${C.orangeDim}`,
            borderRadius:4, letterSpacing:1}}>
          🎙 VOICE
        </span>
        <span>·</span>
        <span onClick={()=>setShowEnrollment(true)}
          style={{cursor:"pointer", color:C.purple, fontWeight:700,
            padding:"2px 8px", border:`1px solid ${C.purple}44`,
            borderRadius:4, letterSpacing:1}}>
          👤 ENROLL
        </span>
        {liveSpeaker && (
          <span style={{color:C.green, fontWeight:700, letterSpacing:1,
            fontFamily:"'IBM Plex Mono',monospace", fontSize:10}}>
            ● {liveSpeaker.name} ({Math.round(liveSpeaker.confidence*100)}%)
          </span>
        )}
      </div>
    </div>
  );
}
