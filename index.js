import http from "http";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import pino from "pino";
import readline from "readline";
import config from "./config/config.js";
import logger from "./utils/logger.js";
import gemini from "./services/gemini.js";
import paperService from "./services/paperService.js";
import downloadService from "./services/downloadService.js";
import userService from "./services/userService.js";
import { handleMessage } from "./handlers/messageHandler.js";

// Live state shown on the preview status page.
const serverStatus = {
  connection: "connecting",
  pairingCode: null,
  phoneNumber: null,
};

function renderStatusPage() {
  const { connection, pairingCode, phoneNumber } = serverStatus;
  const statusLabel =
    connection === "open"
      ? "🟢 Connected to WhatsApp"
      : connection === "close"
        ? "🔴 Disconnected (reconnecting...)"
        : connection === "waiting-number"
          ? "🔴 PHONE_NUMBER required (pairing-code login only)"
          : connection === "blocked"
            ? "🔴 WhatsApp rejected the connection (401)"
            : "🟡 Connecting / waiting for pairing code...";

  const pairingHtml = pairingCode
    ? `<p>Open <b>WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device &gt; Link with phone number instead</b> and enter:</p>
       <code style="display:inline-block;font-size:2.2rem;letter-spacing:0.4rem;background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:14px 20px;margin:8px 0 20px;font-weight:700">${pairingCode}</code>`
    : phoneNumber
      ? `<p>Pairing code will appear here shortly (requesting from WhatsApp...).</p>`
      : `<p>No pairing code yet — set the <code>PHONE_NUMBER</code> env var (e.g. <code>94764642432</code>) and restart the preview to get one.</p>`;

  const blockedHtml =
    connection === "blocked"
      ? `<p>WhatsApp refused the device-linking handshake from this server's IP (HTTP 401 Connection Failure). This is a WhatsApp-side block of datacenter/cloud IPs — QR and pairing-code login both won't work from here.</p>
         <p>Run the bot from a <b>home network or a VPS whose IP WhatsApp accepts</b> (e.g. <code>npm start</code> locally), set <code>PHONE_NUMBER</code>, and use the printed pairing code.</p>`
      : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>A/L Insight Bot</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#111}code{background:#eee;border-radius:6px;padding:2px 6px}</style>
</head><body>
<h1>📚 A/L Insight Bot</h1>
<p>${statusLabel}</p>
${pairingHtml}
${blockedHtml}
</body></html>`;
}

const statusServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, connection: serverStatus.connection }));
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(renderStatusPage());
});

function askPhoneNumber() {
  // In non-interactive environments (like the Freebuff preview) there is no
  // terminal to type into, so skip the prompt and fall back to PHONE_NUMBER
  // instead of silently waiting 2 minutes.
  if (!process.stdin.isTTY) {
    logger.warn(
      "No interactive terminal detected. Set PHONE_NUMBER in your environment (e.g. PHONE_NUMBER=94764642432) to use pairing-code login (QR login is disabled).",
    );
    return Promise.resolve(null);
  }

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
      serverStatus.pairingCode = pairingCode;
      logger.success("PAIRING CODE: " + pairingCode);
      logger.info("In WhatsApp: Settings > Linked Devices > Link a Device > Link with phone number instead.");
      logger.info(`Enter this pairing code: ${pairingCode}`);
      return pairingCode;
    } catch (err) {
      logger.warn(`Pairing request attempt ${attempt} failed: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  logger.error("Could not obtain a pairing code. Restart the bot to try again.");
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

  let registered = false;
  let lastQr = null;

  serverStatus.connection = "connecting";
  serverStatus.phoneNumber = phoneNumber;
  serverStatus.pairingCode = null;

  // Bind the status port so the platform's readiness probe succeeds and the
  // status page can show the pairing code. Honors PORT (Freebuff) and
  // SERVER_PORT (Pterodactyl panels).
  const port = process.env.PORT || process.env.SERVER_PORT || 3000;
  statusServer.listen(port, "0.0.0.0", () => {
    logger.info(`Status page listening on http://0.0.0.0:${port}`);
  });

  if (!phoneNumber) {
    logger.error(
      "PHONE_NUMBER is required: QR login is disabled, so pairing-code login is the only option.",
    );
    logger.error(
      "Set PHONE_NUMBER (e.g. PHONE_NUMBER=94764642432) in the environment and restart, or run the bot interactively and type the number when prompted.",
    );
    serverStatus.connection = "waiting-number";
    return;
  }

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu(config.bot.name),
    syncFullHistory: false,
    markOnlineOnConnect: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR login is disabled — pairing code is the only login method. Baileys
    // emits a fresh `qr` event as soon as the socket is connected to WhatsApp
    // and ready to authenticate, so we use that event only as the trigger to
    // request the pairing code (the QR itself is never rendered or displayed),
    // and re-request on every new QR so the printed code never goes stale
    // while the user is typing it into WhatsApp.
    if (qr && qr !== lastQr && phoneNumber && !registered) {
      lastQr = qr;
      requestPairingCodeWithRetry(sock, phoneNumber);
    }

    if (connection === "open") {
      registered = true;
      serverStatus.connection = "open";
      logger.success(`${config.bot.name} connected to WhatsApp`);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      // A fresh login attempt (no device linked yet) can be rejected by
      // WhatsApp with a 401 "Connection Failure" when the server blocks the
      // connecting IP (common for datacenter/cloud IPs). There is no session
      // to be "logged out" of, so don't exit — surface the reason on the
      // status page and let the user restart from a network WhatsApp accepts.
      if (statusCode === DisconnectReason.loggedOut && !registered) {
        serverStatus.connection = "blocked";
        logger.error(
          "WhatsApp rejected the connection (401). Device linking (pairing code) is blocked from this network/IP — run the bot from a home or VPS IP that WhatsApp accepts.",
        );
        return;
      }

      serverStatus.connection = "close";
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