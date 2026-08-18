import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import logger from "./logger.js";

export function buildRows(items) {
  return items.map((item, index) => ({
    header: item.header || String(index + 1),
    title: item.title,
    description: item.description || "",
    id: item.id,
  }));
}

export async function sendInteractiveList(conn, jid, options) {
  const { title, body, footer, buttonLabel, sections, quoted } = options;

  const interactiveMessage = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            title: title || "",
            hasMediaAttachment: false,
          },
          body: { text: body || "" },
          footer: { text: footer || "" },
          carouselMessage: {
            cards: [
              {
                card: {
                  title: title || "",
                  body: { text: body || "" },
                  nativeFlowMessage: {
                    buttons: [
                      {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                          title: buttonLabel || "Select",
                          sections,
                        }),
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    },
  };

  const msg = generateWAMessageFromContent(jid, interactiveMessage, {
    userJid: conn.user.id,
  });

  await conn.relayMessage(jid, msg.message, { messageId: msg.key.id, quoted });
}

export async function sendPlainList(conn, jid, options) {
  const { title, body, footer, sections, quoted } = options;
  let text = `${title}\n\n${body}`;
  for (const section of sections) {
    if (section.title) text += `\n\n*${section.title}*`;
    section.rows.forEach((row, i) => {
      text += `\n${i + 1}. ${row.title}`;
    });
  }
  if (footer) text += `\n\n${footer}`;
  await conn.sendMessage(jid, { text }, { quoted });
}

export async function sendSelection(conn, jid, options) {
  try {
    await sendInteractiveList(conn, jid, options);
  } catch (err) {
    logger.warn("Interactive list failed, using plain text fallback:", err.message);
    await sendPlainList(conn, jid, options);
  }
}

export function getInteractiveId(msg) {
  try {
    const interactive = msg.message?.interactiveResponseMessage;
    if (interactive?.nativeFlowResponseMessage?.paramsJson) {
      const params = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson);
      return params.id || null;
    }
    const listResponse = msg.message?.listResponseMessage;
    if (listResponse?.singleSelectReply?.selectedRowId) {
      return listResponse.singleSelectReply.selectedRowId;
    }
    const buttonResponse = msg.message?.buttonsResponseMessage;
    if (buttonResponse?.selectedButtonId) {
      return buttonResponse.selectedButtonId;
    }
    const templateResponse = msg.message?.templateButtonReplyMessage;
    if (templateResponse?.selectedId) {
      return templateResponse.selectedId;
    }
  } catch (err) {
    logger.warn("Failed to parse interactive response:", err.message);
  }
  return null;
}

export default { sendInteractiveList, sendPlainList, sendSelection, getInteractiveId, buildRows };