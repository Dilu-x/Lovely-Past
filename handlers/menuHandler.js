import { t, LANGS } from "../utils/language.js";
import { sendSelection, buildRows } from "../utils/menus.js";
import userService from "../services/userService.js";
import logger from "../utils/logger.js";

const SUBJECT_LABELS = {
  physics: "⚛️ Physics",
  chemistry: "🧪 Chemistry",
  biology: "🌱 Biology",
  "combined-mathematics": "📐 Combined Mathematics",
  ict: "💻 ICT",
  accounting: "📊 Accounting",
  economics: "📈 Economics",
  "business-studies": "💼 Business Studies",
  english: "📖 English",
  sinhala: "📜 Sinhala",
  tamil: "📜 Tamil",
};

export function subjectLabel(subject) {
  return SUBJECT_LABELS[subject] || subject.replace(/-/g, " ");
}

export function mcqSubjects() {
  return Object.keys(SUBJECT_LABELS).filter((s) => s !== "english" && s !== "sinhala" && s !== "tamil");
}

export async function sendLanguageSelection(conn, jid) {
  await sendSelection(conn, jid, {
    title: t("selectLanguageButton", "en"),
    body: t("selectLanguage", "en"),
    footer: "📚 A/L Insight Bot",
    buttonLabel: t("selectLanguageButton", "en"),
    sections: [
      {
        title: "Language",
        rows: buildRows([
          { title: "🇬🇧 English", id: "lang:en" },
          { title: "🇱🇰 தமிழ்", id: "lang:ta" },
          { title: "🇱🇰 සිංහල", id: "lang:si" },
        ]),
      },
    ],
  });
}

export async function handleLanguageSelection(conn, jid, lang) {
  const code = userService.setLanguage(jid, lang);
  const langName = LANGS[code] || code;
  await conn.sendMessage(jid, { text: t("langSaved", code, langName) });
  await sendStudyMenu(conn, jid);
}

export async function sendStudyMenu(conn, jid) {
  const lang = userService.getLanguage(jid) || "en";
  await sendSelection(conn, jid, {
    title: t("studyMenuButton", lang),
    body: t("studyMenu", lang),
    footer: "📚 A/L Insight Bot",
    buttonLabel: t("studyMenuButton", lang),
    sections: [
      {
        title: t("studyMenu", lang),
        rows: buildRows([
          { title: t("pastPapers", lang), id: "menu:papers" },
          { title: t("notes", lang), id: "menu:notes" },
          { title: t("modelPapers", lang), id: "menu:model-papers" },
          { title: t("mcq", lang), id: "menu:mcq" },
          { title: t("askAI", lang), id: "menu:ai" },
        ]),
      },
    ],
  });
}

export async function sendMainMenu(conn, jid) {
  const lang = userService.getLanguage(jid) || "en";
  await sendSelection(conn, jid, {
    title: t("mainMenu", lang),
    body: t("mainMenuText", lang),
    footer: "📚 A/L Insight Bot",
    buttonLabel: t("studyMenuButton", lang),
    sections: [
      {
        title: t("mainMenuText", lang),
        rows: buildRows([
          { title: t("askAI", lang), id: "menu:ai" },
          { title: t("pastPapers", lang), id: "menu:papers" },
          { title: t("notes", lang), id: "menu:notes" },
          { title: t("modelPapers", lang), id: "menu:model-papers" },
          { title: t("mcq", lang), id: "menu:mcq" },
        ]),
      },
    ],
  });
}

export async function handleMenuId(conn, jid, id) {
  switch (id) {
    case "menu:papers":
    case "menu:notes":
    case "menu:model-papers": {
      const { startFlow } = await import("./paperHandler.js");
      const type = id.replace("menu:", "");
      return startFlow(conn, jid, type);
    }
    case "menu:mcq": {
      const { mcqHandlerStart } = await import("./mcqHandler.js");
      return mcqHandlerStart(conn, jid);
    }
    case "menu:ai": {
      userService.clearSession(jid);
      const lang = userService.getLanguage(jid) || "en";
      const prompts = {
        en: "🤖 Ask me anything about your A/L subjects!",
        ta: "🤖 உங்கள் A/L பாடங்கள் பற்றி ஏதாவது கேளுங்கள்!",
        si: "🤖 ඔබේ A/L විෂයයන් ගැන ඕනෑම දෙයක් අසන්න!",
      };
      return conn.sendMessage(jid, { text: prompts[lang] || prompts.en });
    }
    default:
      return sendStudyMenu(conn, jid);
  }
}

export default {
  sendLanguageSelection,
  handleLanguageSelection,
  sendStudyMenu,
  sendMainMenu,
  handleMenuId,
  subjectLabel,
  mcqSubjects,
};