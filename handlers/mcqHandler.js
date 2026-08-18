import { t } from "../utils/language.js";
import { sendSelection, buildRows } from "../utils/menus.js";
import { subjectLabel, mcqSubjects, sendStudyMenu } from "./menuHandler.js";
import userService from "../services/userService.js";
import gemini from "../services/gemini.js";
import logger from "../utils/logger.js";

const MCQ_ANSWER_PATTERN = /^\s*(\d\s*[a-d]\s*)+$/i;

export async function mcqHandlerStart(conn, jid) {
  const lang = userService.getLanguage(jid) || "en";
  const subjects = mcqSubjects();

  const rows = buildRows(
    subjects.map((subject) => ({ title: subjectLabel(subject), id: `mcqs:${subject}` })),
  );
  rows.push({ header: "", title: t("back", lang), id: "back" });
  rows.push({ header: "", title: t("mainMenu", lang), id: "main" });

  const session = userService.getSession(jid);
  session.flow = "mcq";
  session.step = "subject";
  userService.setSession(jid, { ...session, _ts: Date.now() });

  return sendSelection(conn, jid, {
    title: t("mcqSubject", lang),
    body: t("mcqSubject", lang),
    footer: "📚 A/L Insight Bot",
    buttonLabel: t("selectSubjectButton", lang),
    sections: [{ title: t("mcqSubject", lang), rows }],
  });
}

export async function handleMcqSelection(conn, jid, id) {
  const lang = userService.getLanguage(jid) || "en";
  const session = userService.getSession(jid);

  if (id === "main") {
    userService.clearSession(jid);
    return sendStudyMenu(conn, jid);
  }

  if (id === "back") {
    userService.clearSession(jid);
    return sendStudyMenu(conn, jid);
  }

  if (id.startsWith("mcqs:")) {
    const subject = id.replace("mcqs:", "");
    await conn.sendMessage(jid, { text: t("mcqGenerating", lang) });
    const questions = await gemini.generateMCQ(jid, subjectLabel(subject).replace(/^[^\s]+\s/, ""), lang === "ta" ? "Tamil" : lang === "si" ? "Sinhala" : "English");

    if (!questions) {
      return conn.sendMessage(jid, { text: t("aiError", lang) });
    }

    session.mcq = { subject, questions };
    userService.setSession(jid, { ...session, _ts: Date.now() });

    await conn.sendMessage(jid, { text: questions });
    return conn.sendMessage(jid, { text: t("mcqAnswerPrompt", lang) });
  }

  return conn.sendMessage(jid, { text: t("invalidSelection", lang) });
}

export async function handleMcqAnswer(conn, jid, text) {
  const lang = userService.getLanguage(jid) || "en";
  const session = userService.getSession(jid);

  if (!session.mcq || !MCQ_ANSWER_PATTERN.test(text)) {
    return false;
  }

  const { subject, questions } = session.mcq;
  const result = await gemini.checkMCQAnswers(jid, subjectLabel(subject).replace(/^[^\s]+\s/, ""), questions, text);

  if (result) {
    await conn.sendMessage(jid, { text: `${t("mcqResults", lang)}\n\n${result}` });
  } else {
    await conn.sendMessage(jid, { text: t("aiError", lang) });
  }

  delete session.mcq;
  userService.setSession(jid, { ...session, _ts: Date.now() });
  return true;
}

export default { mcqHandlerStart, handleMcqSelection, handleMcqAnswer };