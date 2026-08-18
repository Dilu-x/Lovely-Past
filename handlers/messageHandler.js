import { getContentType } from "@whiskeysockets/baileys";
import config from "../config/config.js";
import { t, normalizeLang } from "../utils/language.js";
import { getInteractiveId } from "../utils/menus.js";
import logger from "../utils/logger.js";
import userService from "../services/userService.js";
import gemini from "../services/gemini.js";
import {
  sendLanguageSelection,
  handleLanguageSelection,
  sendStudyMenu,
  sendMainMenu,
  handleMenuId,
} from "./menuHandler.js";
import { startFlow, handleFlowSelection } from "./paperHandler.js";
import { mcqHandlerStart, handleMcqSelection, handleMcqAnswer } from "./mcqHandler.js";
import { handleText, handleImage } from "./aiHandler.js";

function extractText(msg) {
  const content = getContentType(msg.message);
  if (!content) return null;

  switch (content) {
    case "conversation":
      return msg.message.conversation || null;
    case "extendedTextMessage":
      return msg.message.extendedTextMessage?.text || null;
    case "imageMessage":
      return msg.message.imageMessage?.caption || null;
    default:
      return null;
  }
}

function isImage(msg) {
  return Boolean(msg.message?.imageMessage);
}

async function handleCommand(conn, jid, text) {
  const clean = text.trim().toLowerCase();
  const cmdMap = config.commands;
  const lang = userService.getLanguage(jid) || "en";

  if (cmdMap.menu.includes(clean)) {
    await sendMainMenu(conn, jid);
    return true;
  }
  if (cmdMap.help.includes(clean)) {
    await conn.sendMessage(jid, { text: t("helpText", lang) });
    return true;
  }
  if (cmdMap.study.includes(clean)) {
    await sendStudyMenu(conn, jid);
    return true;
  }
  if (cmdMap.papers.includes(clean)) {
    await startFlow(conn, jid, "papers");
    return true;
  }
  if (cmdMap.notes.includes(clean)) {
    await startFlow(conn, jid, "notes");
    return true;
  }
  if (cmdMap.mcq.includes(clean)) {
    await mcqHandlerStart(conn, jid);
    return true;
  }
  if (cmdMap.ai.includes(clean)) {
    userService.clearSession(jid);
    const prompts = {
      en: "🤖 Ask me anything about your A/L subjects!",
      ta: "🤖 உங்கள் A/L பாடங்கள் பற்றி ஏதாவது கேளுங்கள்!",
      si: "🤖 ඔබේ A/L විෂයයන් ගැන ඕනෑම දෙයක් අසන්න!",
    };
    await conn.sendMessage(jid, { text: prompts[lang] || prompts.en });
    return true;
  }
  if (cmdMap.language.includes(clean)) {
    userService.setSession(jid, { step: "language", _ts: Date.now() });
    await sendLanguageSelection(conn, jid);
    return true;
  }
  if (cmdMap.reset.includes(clean)) {
    userService.clearSession(jid);
    gemini.clearHistory(jid);
    const msgs = {
      en: "✅ Conversation history cleared.",
      ta: "✅ உரையாடல் வரலாறு அழிக்கப்பட்டது.",
      si: "✅ සංවාද ඉතිහාසය හිස් කරන ලදී.",
    };
    await conn.sendMessage(jid, { text: msgs[lang] || msgs.en });
    return true;
  }
  return false;
}

async function handleInteractiveId(conn, jid, id) {
  const lang = userService.getLanguage(jid) || "en";
  const session = userService.getSession(jid);

  if (id.startsWith("lang:")) {
    const code = id.replace("lang:", "");
    return handleLanguageSelection(conn, jid, code);
  }

  if (id.startsWith("menu:")) {
    return handleMenuId(conn, jid, id);
  }

  if (id.startsWith("mcqs:")) {
    return handleMcqSelection(conn, jid, id);
  }

  if (id === "back" || id === "main") {
    if (session.flow === "mcq") {
      return handleMcqSelection(conn, jid, id);
    }
    if (session.flow && ["papers", "notes", "model-papers"].includes(session.flow)) {
      return handleFlowSelection(conn, jid, id);
    }
    return sendStudyMenu(conn, jid);
  }

  if (["y:", "m:", "s:", "p:"].some((prefix) => id.startsWith(prefix))) {
    if (session.flow === "mcq") {
      return handleMcqSelection(conn, jid, id);
    }
    return handleFlowSelection(conn, jid, id);
  }

  return conn.sendMessage(jid, { text: t("invalidSelection", lang) });
}

export async function handleMessage(conn, msg) {
  const jid = msg.key?.remoteJid;
  if (!jid || msg.key?.fromMe) return;

  try {
    const text = extractText(msg);
    const interactiveId = getInteractiveId(msg);

    if (interactiveId) {
      return await handleInteractiveId(conn, jid, interactiveId);
    }

    if (isImage(msg)) {
      return await handleImage(conn, msg, jid, text);
    }

    if (!text) return;

    const clean = text.trim();

    if (userService.isNewUser(jid) && !clean.startsWith(".")) {
      await conn.sendMessage(jid, { text: t("welcome", "en") });
      userService.setSession(jid, { step: "language", _ts: Date.now() });
      return sendLanguageSelection(conn, jid);
    }

    const session = userService.getSession(jid);

    if (session.step === "language") {
      const lower = clean.toLowerCase();
      if (["english", "tamil", "sinhala"].includes(lower)) {
        return handleLanguageSelection(conn, jid, normalizeLang(lower));
      }
    }

    if (clean.startsWith(".")) {
      const handled = await handleCommand(conn, jid, clean);
      if (handled) return;
    }

    const answeredMcq = await handleMcqAnswer(conn, jid, clean);
    if (answeredMcq) return;

    return handleText(conn, jid, clean);
  } catch (err) {
    logger.error("Message handling error:", err.message);
    try {
      await conn.sendMessage(jid, {
        text: "❌ Something went wrong. Please try again.",
      });
    } catch {
      /* ignore */
    }
  }
}

export default { handleMessage };