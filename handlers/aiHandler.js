import { t } from "../utils/language.js";
import { sendSelection, buildRows } from "../utils/menus.js";
import { sendTyping, sendPaused } from "../utils/typing.js";
import userService from "../services/userService.js";
import gemini from "../services/gemini.js";
import logger from "../utils/logger.js";

export async function sendStudyMenuButton(conn, jid) {
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

export async function handleText(conn, jid, text) {
  const lang = userService.getLanguage(jid) || "en";

  await sendTyping(conn, jid);

  let answer = null;
  try {
    answer = await gemini.generateResponse(jid, text);
  } catch (err) {
    logger.error("AI handler error:", err.message);
  }

  await sendPaused(conn, jid);

  if (!answer) {
    await conn.sendMessage(jid, { text: t("aiError", lang) });
    return;
  }

  await conn.sendMessage(jid, { text: answer });
  await sendStudyMenuButton(conn, jid);
}

export async function handleImage(conn, msg, jid, caption) {
  const lang = userService.getLanguage(jid) || "en";

  await conn.sendMessage(jid, { text: t("imageQuestion", lang) });
  await sendTyping(conn, jid);

  try {
    const buffer = await conn.downloadMediaMessage(msg);
    const mimeType = msg.message?.imageMessage?.mimetype || "image/jpeg";

    const answer = await gemini.analyzeImage(jid, buffer, mimeType, caption);
    await sendPaused(conn, jid);

    if (!answer) {
      await conn.sendMessage(jid, { text: t("aiError", lang) });
      return;
    }

    await conn.sendMessage(jid, { text: answer });
    await sendStudyMenuButton(conn, jid);
  } catch (err) {
    logger.error("Image handling error:", err.message);
    await sendPaused(conn, jid);
    await conn.sendMessage(jid, { text: t("aiError", lang) });
  }
}

export default { handleText, handleImage, sendStudyMenuButton };