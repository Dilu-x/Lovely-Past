import { t, mediumLabel } from "../utils/language.js";
import { sendSelection, buildRows } from "../utils/menus.js";
import { sendStudyMenu } from "./menuHandler.js";
import userService from "../services/userService.js";
import paperService from "../services/paperService.js";
import downloadService, { buildFileName } from "../services/downloadService.js";
import logger from "../utils/logger.js";

const TYPE_KEYS = {
  papers: "pastPapers",
  notes: "notes",
  "model-papers": "modelPapers",
};

function typeTitle(type, lang) {
  return t(TYPE_KEYS[type] || "pastPapers", lang);
}

export async function startFlow(conn, jid, type) {
  const lang = userService.getLanguage(jid) || "en";
  const session = userService.getSession(jid);
  session.flow = type;
  session.step = "year";
  session.year = null;
  session.medium = null;
  session.subject = null;
  userService.setSession(jid, { ...session, _ts: Date.now() });
  return sendYearSelection(conn, jid, type);
}

export async function sendYearSelection(conn, jid, type) {
  const lang = userService.getLanguage(jid) || "en";
  const years = paperService.getYears(type);

  if (years.length === 0) {
    return conn.sendMessage(jid, { text: t("noData", lang) });
  }

  const rows = buildRows(years.map((year) => ({ title: `📅 ${year}`, id: `y:${year}` })));
  rows.push({ header: "", title: t("back", lang), id: "back" });
  rows.push({ header: "", title: t("mainMenu", lang), id: "main" });

  return sendSelection(conn, jid, {
    title: t("selectYear", lang),
    body: `${typeTitle(type, lang)}\n\n${t("selectYear", lang)}`,
    footer: "📚 A/L Insight Bot",
    buttonLabel: t("selectYearButton", lang),
    sections: [{ title: t("selectYear", lang), rows }],
  });
}

export async function sendMediumSelection(conn, jid, type, year) {
  const lang = userService.getLanguage(jid) || "en";
  const mediums = paperService.getMediums(year, type);

  if (mediums.length === 0) {
    return conn.sendMessage(jid, { text: t("noData", lang) });
  }

  const rows = buildRows(
    mediums.map((medium) => ({ title: mediumLabel(medium), id: `m:${medium}` })),
  );
  rows.push({ header: "", title: t("back", lang), id: "back" });
  rows.push({ header: "", title: t("mainMenu", lang), id: "main" });

  return sendSelection(conn, jid, {
    title: t("selectMedium", lang),
    body: `📅 ${year}\n\n${t("selectMedium", lang)}`,
    footer: "📚 A/L Insight Bot",
    buttonLabel: t("selectMediumButton", lang),
    sections: [{ title: t("selectMedium", lang), rows }],
  });
}

export async function sendSubjectSelection(conn, jid, type, year, medium) {
  const lang = userService.getLanguage(jid) || "en";
  const subjects = paperService.getSubjects(year, medium, type);

  if (subjects.length === 0) {
    return conn.sendMessage(jid, { text: t("noData", lang) });
  }

  const { subjectLabel } = await import("./menuHandler.js");
  const rows = buildRows(
    subjects.map((subject) => ({ title: subjectLabel(subject), id: `s:${subject}` })),
  );
  rows.push({ header: "", title: t("back", lang), id: "back" });
  rows.push({ header: "", title: t("mainMenu", lang), id: "main" });

  return sendSelection(conn, jid, {
    title: t("selectSubject", lang),
    body: `📅 ${year} · ${mediumLabel(medium)}\n\n${t("selectSubject", lang)}`,
    footer: "📚 A/L Insight Bot",
    buttonLabel: t("selectSubjectButton", lang),
    sections: [{ title: t("selectSubject", lang), rows }],
  });
}

export async function sendPaperSelection(conn, jid, type, year, medium, subject) {
  const lang = userService.getLanguage(jid) || "en";
  const papers = paperService.getPapers(year, medium, subject, type);

  if (papers.length === 0) {
    return conn.sendMessage(jid, { text: t("noData", lang) });
  }

  const { subjectLabel } = await import("./menuHandler.js");
  const rows = buildRows(
    papers.map((paper) => ({ title: `📄 ${paper.name}`, id: `p:${paper.id || paper.name}` })),
  );
  rows.push({ header: "", title: t("back", lang), id: "back" });
  rows.push({ header: "", title: t("mainMenu", lang), id: "main" });

  return sendSelection(conn, jid, {
    title: t("selectPaper", lang),
    body: `📅 ${year} · ${mediumLabel(medium)} · ${subjectLabel(subject)}\n\n${t("selectPaper", lang)}`,
    footer: "📚 A/L Insight Bot",
    buttonLabel: t("selectPaperButton", lang),
    sections: [{ title: t("selectPaper", lang), rows }],
  });
}

export async function sendPaper(conn, jid, type, year, medium, subject, paperId) {
  const lang = userService.getLanguage(jid) || "en";
  const paper = paperService.getPaper(year, medium, subject, paperId, type);

  if (!paper) {
    return conn.sendMessage(jid, { text: t("noData", lang) });
  }

  await conn.sendMessage(jid, { text: t("preparing", lang) });

  let filePath = null;
  const fileName = buildFileName(type, year, subject, medium);
  try {
    filePath = await downloadService.download(paper.url, fileName);
  } catch (err) {
    logger.error(`Download failed for ${paper.url}:`, err.message);
    return conn.sendMessage(jid, { text: t("downloadError", lang) });
  }

  try {
    await conn.sendMessage(
      jid,
      {
        document: { url: filePath },
        fileName,
        mimetype: "application/pdf",
        caption: `📚 A/L Insight Bot\n\n📄 ${paper.name}\n🌐 ${mediumLabel(medium)}`,
      },
      {},
    );
  } catch (err) {
    logger.error("Failed to send PDF:", err.message);
    await conn.sendMessage(jid, { text: t("downloadError", lang) });
  } finally {
    downloadService.cleanup(filePath);
  }
}

export async function handleFlowSelection(conn, jid, id) {
  const lang = userService.getLanguage(jid) || "en";
  const session = userService.getSession(jid);
  const type = session.flow || "papers";

  if (id === "main") {
    userService.clearSession(jid);
    return sendStudyMenu(conn, jid);
  }

  if (id === "back") {
    switch (session.step) {
      case "paper":
      case "subject":
        session.step = "medium";
        userService.setSession(jid, { ...session, _ts: Date.now() });
        return sendMediumSelection(conn, jid, type, session.year);
      case "medium":
        session.step = "year";
        userService.setSession(jid, { ...session, _ts: Date.now() });
        return sendYearSelection(conn, jid, type);
      default:
        userService.clearSession(jid);
        return sendStudyMenu(conn, jid);
    }
  }

  const [prefix, value] = id.split(":");

  switch (prefix) {
    case "y":
      session.step = "medium";
      session.year = value;
      userService.setSession(jid, { ...session, _ts: Date.now() });
      return sendMediumSelection(conn, jid, type, value);

    case "m":
      session.step = "subject";
      session.medium = value;
      userService.setSession(jid, { ...session, _ts: Date.now() });
      return sendSubjectSelection(conn, jid, type, session.year, value);

    case "s":
      session.step = "paper";
      session.subject = value;
      userService.setSession(jid, { ...session, _ts: Date.now() });
      return sendPaperSelection(conn, jid, type, session.year, session.medium, value);

    case "p":
      return sendPaper(conn, jid, type, session.year, session.medium, session.subject, value);

    default:
      return conn.sendMessage(jid, { text: t("invalidSelection", lang) });
  }
}

export default {
  startFlow,
  sendYearSelection,
  sendMediumSelection,
  sendSubjectSelection,
  sendPaperSelection,
  sendPaper,
  handleFlowSelection,
};