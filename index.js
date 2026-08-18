import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import readline from "readline";
import config from "./config/config.js";
import logger from "./utils/logger.js";
import gemini from "./services/gemini.js";
import paperService from "./services/paperService.js";
import downloadService from "./services/downloadService.js";
import userService from "./services/userService.js";
import { handleMessage } from "./handlers/messageHandler.js";

function askPhoneNumber() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      rl.close();
      resolve(null);
    }, 120000);

    rl.question("Enter your WhatsApp number (e.g. 94764642432): ", (input) => {
      clearTimeout(timeout);
      rl.close();
      const cleaned = (input || "").replace(/[^0-9]/g, "");
      resolve(cleaned || null);
    });
  });
}

function normalizeNumber(input) {
  const cleaned = (input || "").replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("0")) return "94" + cleaned.slice(1);
  return cleaned;
}

async function requestPairingCodeWithRetry(sock, phoneNumber) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const pairingCode = await sock.requestPairingCode(phoneNumber);
      logger.success("PAIRING CODE: " + pairingCode);
      logger.info("In WhatsApp: Settings > Linked Devices > Link a Device > Link with phone number instead.");
      logger.info(`Enter this pairing code: ${pairingCode}`);
      return pairingCode;
    } catch (err) {
      logger.warn(`Pairing request attempt ${attempt} failed: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  logger.error("Could not obtain a pairing code. Try QR login or restart.");
  return null;
}

async function startBot() {
  logger.info(`Starting ${config.bot.name}...`);

  gemini.initialize();
  paperService.reload();
  logger.info(`Loaded years: ${paperService.getYears("papers").join(", ") || "none"}`);

  const { state, saveCreds } = await useMultiFileAuthState(config.bot.sessionDir);

  let phoneNumber = normalizeNumber(process.env.PHONE_NUMBER);
  if (!phoneNumber) {
    phoneNumber = await askPhoneNumber();
  }
  if (phoneNumber) {
    logger.info(`Using pairing code for number: ${phoneNumber}`);
  }

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: !phoneNumber,
    browser: Browsers.ubuntu(config.bot.name),
    syncFullHistory: false,
    markOnlineOnConnect: true,
  });

  sock.ev.on("creds.update", saveCreds);

  if (phoneNumber) {
    requestPairingCodeWithRetry(sock, phoneNumber);
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      logger.info("Scan the QR code with WhatsApp to connect.");
    }

    if (connection === "open") {
      logger.success(`${config.bot.name} connected to WhatsApp`);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn(
        `Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`,
      );
      if (shouldReconnect) {
        setTimeout(startBot, 3000);
      } else {
        logger.error("Logged out. Delete the session folder and restart.");
        process.exit(1);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        if (msg.key?.fromMe) continue;
        await sock.readMessages([msg.key]);
        await handleMessage(sock, msg);
      } catch (err) {
        logger.error("Failed to process message:", err.message);
      }
    }
  });

  setInterval(() => downloadService.cleanupAll(), 60 * 60 * 1000);
  setInterval(() => userService.cleanupOldSessions(), 60 * 60 * 1000);
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err.message);
});

startBot().catch((err) => {
  logger.error("Failed to start bot:", err.message);
  process.exit(1);
});