export const LANGS = {
  en: "English",
  ta: "Tamil",
  si: "Sinhala",
};

export const LANG_FLAGS = {
  en: "🇬🇧",
  ta: "🇱🇰",
  si: "🇱🇰",
};

export function normalizeLang(code) {
  if (!code) return "en";
  const c = String(code).toLowerCase().trim();
  if (c === "en" || c === "english" || c === "english-medium" || c === "en-medium") return "en";
  if (c === "ta" || c === "tamil" || c === "tamil-medium" || c === "ta-medium") return "ta";
  if (c === "si" || c === "sinhala" || c === "sinhala-medium" || c === "si-medium") return "si";
  return "en";
}

export function detectLanguage(text) {
  if (!text || typeof text !== "string") return "en";
  let tamilCount = 0;
  let sinhalaCount = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0x0b80 && code <= 0x0bff) tamilCount++;
    else if (code >= 0x0d80 && code <= 0x0dff) sinhalaCount++;
  }
  if (tamilCount > sinhalaCount && tamilCount > 0) return "ta";
  if (sinhalaCount > tamilCount && sinhalaCount > 0) return "si";

  const lower = text.toLowerCase();
  const tanglishWords = ["enna", "ennu", "pannu", "pannunga", "pannala", "ille", "illa", "irukku", "irukka", "sollu", "songa", "summa", "aachu", "kudukka", "kidaikkum", "illaamal", "edhu", "edhuve", "enga", "enga", "epdi", "epadi", "vaanga", "poda", "vela", "padichu", "padikka", "mark", "paperla", "question", "answerla"];
  const singlishWords = ["kiyanna", "mokakda", "mokak", "kohomada", "panna", "karanna", "balanna", "iyalle", "pothu", "wela", "poth", "saha", "hari", "naha", "nadda", "kala", "wath", "mama", "oba", "api", "ekka", "gena", "thiyenne", "thiyenawa", "wage", "karanawa", "kiyanawa"];
  let taScore = 0;
  let siScore = 0;
  for (const w of tanglishWords) {
    if (lower.includes(w)) taScore++;
  }
  for (const w of singlishWords) {
    if (lower.includes(w)) siScore++;
  }
  if (taScore > siScore && taScore >= 2) return "ta";
  if (siScore > taScore && siScore >= 2) return "si";
  return "en";
}

const ui = {
  welcome: {
    en: `👋 Welcome to A/L Insight Bot!\n\nYour personal A/L AI Study Assistant. 📚`,
    ta: `👋 A/L Insight Bot-க்கு வரவேற்கிறோம்!\n\nஉங்கள் தனிப்பட்ட A/L AI படிப்பு உதவியாளர். 📚`,
    si: `👋 A/L Insight Bot වෙත සාදරයෙන් පිළිගනිමු!\n\nඔබේ පෞද්ගලික A/L AI අධ්‍යයන සහායකයා. 📚`,
  },
  selectLanguage: {
    en: `🌐 Please select your language.\n\nPlease select the language you want to use.`,
    ta: `🌐 உங்கள் மொழியை தேர்ந்தெடுக்கவும்.\n\nநீங்கள் பயன்படுத்த விரும்பும் மொழியை தேர்ந்தெடுக்கவும்.`,
    si: `🌐 කරුණාකර ඔබේ භාෂාව තෝරන්න.\n\nඔබට භාවිතා කිරීමට අවශ්‍ය භාෂාව තෝරන්න.`,
  },
  selectLanguageButton: {
    en: "🌐 Select Language",
    ta: "🌐 மொழியை தேர்ந்தெடுக்கவும்",
    si: "🌐 භාෂාව තෝරන්න",
  },
  langSaved: {
    en: (lang) => `✅ Language set to ${lang}.`,
    ta: (lang) => `✅ மொழி ${lang} ஆக அமைக்கப்பட்டது.`,
    si: (lang) => `✅ භාෂාව ${lang} ලෙස සකසා ඇත.`,
  },
  studyMenu: {
    en: `📚 A/L Study Menu\n\nSelect an option below.`,
    ta: `📚 A/L படிப்பு மெனு\n\nகீழே ஒரு விருப்பத்தை தேர்ந்தெடுக்கவும்.`,
    si: `📚 A/L අධ්‍යයන මෙනුව\n\nපහත විකල්පයක් තෝරන්න.`,
  },
  studyMenuButton: {
    en: "📚 A/L Study Menu",
    ta: "📚 A/L படிப்பு மெனு",
    si: "📚 A/L අධ්‍යයන මෙනුව",
  },
  pastPapers: {
    en: "📄 Past Papers",
    ta: "📄 பழைய தேர்வு வினாத்தாள்கள்",
    si: "📄 පසුගිය ප්‍රශ්න පත්‍ර",
  },
  notes: {
    en: "📚 Notes",
    ta: "📚 குறிப்புகள்",
    si: "📚 සටහන්",
  },
  modelPapers: {
    en: "📝 Model Papers",
    ta: "📝 மாதிரி வினாத்தாள்கள்",
    si: "📝 ආදර්ශ ප්‍රශ්න පත්‍ර",
  },
  mcq: {
    en: "❓ MCQ",
    ta: "❓ MCQ",
    si: "❓ MCQ",
  },
  askAI: {
    en: "🤖 Ask AI",
    ta: "🤖 AI-யிடம் கேளுங்கள்",
    si: "🤖 AI ගෙන් අසන්න",
  },
  selectYear: {
    en: `📅 Select A/L Year`,
    ta: `📅 A/L வருடத்தை தேர்ந்தெடுக்கவும்`,
    si: `📅 A/L වසර තෝරන්න`,
  },
  selectYearButton: {
    en: "📅 Select Year",
    ta: "📅 வருடத்தை தேர்ந்தெடுக்கவும்",
    si: "📅 වසර තෝරන්න",
  },
  selectMedium: {
    en: `🌐 Select Medium`,
    ta: `🌐 மொழி முறையை தேர்ந்தெடுக்கவும்`,
    si: `🌐 මාධ්‍යය තෝරන්න`,
  },
  selectMediumButton: {
    en: "🌐 Select Medium",
    ta: "🌐 மொழி முறையை தேர்ந்தெடுக்கவும்",
    si: "🌐 මාධ්‍යය තෝරන්න",
  },
  selectSubject: {
    en: `📚 Select Subject`,
    ta: `📚 பாடத்தை தேர்ந்தெடுக்கவும்`,
    si: `📚 විෂය තෝරන්න`,
  },
  selectSubjectButton: {
    en: "📚 Select Subject",
    ta: "📚 பாடத்தை தேர்ந்தெடுக்கவும்",
    si: "📚 විෂය තෝරන්න",
  },
  selectPaper: {
    en: `📄 Select Paper`,
    ta: `📄 வினாத்தாளை தேர்ந்தெடுக்கவும்`,
    si: `📄 ප්‍රශ්න පත්‍රය තෝරන්න`,
  },
  selectPaperButton: {
    en: "📄 Select Paper",
    ta: "📄 வினாத்தாளை தேர்ந்தெடுக்கவும்",
    si: "📄 ප්‍රශ්න පත්‍රය තෝරන්න",
  },
  preparing: {
    en: `📥 Preparing your paper...`,
    ta: `📥 உங்கள் வினாத்தாளை தயார் செய்கிறேன்...`,
    si: `📥 ඔබේ ප්‍රශ්න පත්‍රය සූදානම් කරමින්...`,
  },
  downloadError: {
    en: `❌ Sorry, this paper could not be downloaded right now.\n\nPlease try again later.`,
    ta: `❌ இந்த paper-ஐ இப்போது download செய்ய முடியவில்லை.\n\nசிறிது நேரம் கழித்து மீண்டும் try செய்யுங்கள்.`,
    si: `❌ මෙම paper එක දැන් download කිරීමට නොහැක.\n\nපසුව නැවත උත්සාහ කරන්න.`,
  },
  noData: {
    en: `❌ No items available for this selection.`,
    ta: `❌ இந்த தேர்வுக்கு எந்த பொருட்களும் இல்லை.`,
    si: `❌ මෙම තේරීම සඳහා කිසිවක් නොමැත.`,
  },
  back: {
    en: "⬅️ Back",
    ta: "⬅️ பின்செல்",
    si: "⬅️ ආපසු",
  },
  mainMenu: {
    en: "🏠 Main Menu",
    ta: "🏠 முதன்மை மெனு",
    si: "🏠 ප්‍රධාන මෙනුව",
  },
  mainMenuText: {
    en: `🏠 Main Menu\n\nSelect an option below.`,
    ta: `🏠 முதன்மை மெனு\n\nகீழே ஒரு விருப்பத்தை தேர்ந்தெடுக்கவும்.`,
    si: `🏠 ප්‍රධාන මෙනුව\n\nපහත විකල්පයක් තෝරන්න.`,
  },
  invalidSelection: {
    en: `❌ Invalid selection. Please try again.`,
    ta: `❌ தவறான தேர்வு. மீண்டும் முயற்சிக்கவும்.`,
    si: `❌ වලංගු නොවන තේරීමකි. කරුණාකර නැවත උත්සාහ කරන්න.`,
  },
  mcqSubject: {
    en: `📚 Select Subject for MCQ`,
    ta: `📚 MCQ-க்கு பாடத்தை தேர்ந்தெடுக்கவும்`,
    si: `📚 MCQ සඳහා විෂය තෝරන්න`,
  },
  mcqGenerating: {
    en: `⏳ Generating MCQs...`,
    ta: `⏳ MCQ-களை உருவாக்குகிறேன்...`,
    si: `⏳ MCQ ජනනය කරමින්...`,
  },
  mcqAnswerPrompt: {
    en: `📝 Reply with your answers like: 1A 2C 3B 4D 5A`,
    ta: `📝 இப்படி பதில் அனுப்புங்கள்: 1A 2C 3B 4D 5A`,
    si: `📝 මෙලෙස පිළිතුරු එවන්න: 1A 2C 3B 4D 5A`,
  },
  mcqResults: {
    en: `📊 Here are your results:`,
    ta: `📊 உங்கள் முடிவுகள் இங்கே:`,
    si: `📊 ඔබේ ප්‍රතිඵල මෙන්න:`,
  },
  aiError: {
    en: `❌ AI service is unavailable right now. Please try again later.`,
    ta: `❌ AI சேவை இப்போது கிடைக்கவில்லை. பின்னர் முயற்சிக்கவும்.`,
    si: `❌ AI සේවාව දැන් ලබාගත නොහැක. කරුණාකර පසුව උත්සාහ කරන්න.`,
  },
  imageQuestion: {
    en: `🔍 Question detected.\n\n📚 Analyzing...`,
    ta: `🔍 கேள்வி கண்டறியப்பட்டது.\n\n📚 பகுப்பாய்வு செய்கிறேன்...`,
    si: `🔍 ප්‍රශ්නය හඳුනා ගන්නා ලදී.\n\n📚 විශ්ලේෂණය කරමින්...`,
  },
  helpText: {
    en: `📚 *A/L Insight Bot - Help*

*Commands:*
.menu - Open main menu
.help - Show this help
.study - Open A/L Study Menu
.papers - Open Past Papers
.notes - Open Notes
.mcq - Generate MCQs
.ai - AI study conversation
.language - Change UI language
.reset - Clear conversation history

*Features:*
• Ask any A/L question in English, Tamil or Sinhala
• Gemini AI answers in your language
• Past papers, model papers and notes by Year → Medium → Subject
• Image question support
• MCQ practice

*Tip:* You can ask questions directly, no menu needed.`,
    ta: `📚 *A/L Insight Bot - உதவி*

*கட்டளைகள்:*
.menu - முதன்மை மெனு
.help - இந்த உதவியை காட்டு
.study - A/L படிப்பு மெனு
.papers - பழைய வினாத்தாள்கள்
.notes - குறிப்புகள்
.mcq - MCQ உருவாக்கு
.ai - AI உரையாடல்
.language - மொழியை மாற்று
.reset - உரையாடல் வரலாற்றை அழி

*அம்சங்கள்:*
• ஆங்கிலம், தமிழ், சிங்களத்தில் கேள்விகளை கேளுங்கள்
• Gemini AI உங்கள் மொழியில் பதில் அளிக்கும்
• வருடம் → மொழி → பாடம் மூலம் வினாத்தாள்கள்
• பட கேள்வி ஆதரவு
• MCQ பயிற்சி

*குறிப்பு:* நேரடியாக கேள்விகளை கேட்கலாம், மெனு தேவையில்லை.`,
    si: `📚 *A/L Insight Bot - උදව්*

*විධාන:*
.menu - ප්‍රධාන මෙනුව
.help - මෙම උදව්ව පෙන්වන්න
.study - A/L අධ්‍යයන මෙනුව
.papers - පසුගිය ප්‍රශ්න පත්‍ර
.notes - සටහන්
.mcq - MCQ ජනනය කරන්න
.ai - AI සංවාදය
.language - UI භාෂාව වෙනස් කරන්න
.reset - සංවාද ඉතිහාසය හිස් කරන්න

*විශේෂාංග:*
• ඉංග්‍රීසි, දෙමළ, සිංහලෙන් ප්‍රශ්න අසන්න
• Gemini AI ඔබේ භාෂාවෙන් පිළිතුරු දෙයි
• වසර → මාධ්‍ය → විෂය අනුව ප්‍රශ්න පත්‍ර
• පින්තූර ප්‍රශ්න සහාය
• MCQ පුහුණුව

*ඉඟිය:* කෙලින්ම ප්‍රශ්න අසන්න, මෙනුව අවශ්‍ය නොවේ.`,
  },
};

export function t(key, lang, ...args) {
  const entry = ui[key];
  if (!entry) return key;
  const text = entry[lang] || entry.en;
  return typeof text === "function" ? text(...args) : text;
}

export function mediumLabel(medium) {
  const flags = { en: "🇬🇧", ta: "🇱🇰", si: "🇱🇰" };
  return `${flags[medium] || ""} ${LANGS[medium] || medium}`;
}

export default { detectLanguage, normalizeLang, t, LANGS, LANG_FLAGS, mediumLabel };