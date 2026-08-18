import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

export const config = {
  rootDir,

  bot: {
    name: process.env.BOT_NAME || "A/L Insight Bot",
    ownerNumber: process.env.OWNER_NUMBER || "",
    sessionDir: process.env.SESSION_DIR || "sessions",
  },

  ai: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    maxHistory: parseInt(process.env.MAX_HISTORY || "10", 10),
    provider: process.env.AI_PROVIDER || "scraper",
    apiUrl: process.env.AI_API_URL || "https://shyracore.indevs.in/api/ai/shitsu",
    apiKeyUrl: process.env.AI_API_KEY || "",
  },

  download: {
    tempDir: process.env.TEMP_DIR || "./tmp",
    timeout: parseInt(process.env.DOWNLOAD_TIMEOUT || "30000", 10),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "20971520", 10),
  },

  data: {
    dir: path.join(rootDir, "data"),
    papers: "papers.json",
    notes: "notes.json",
    modelPapers: "model-papers.json",
    users: "users.json",
  },

  commands: {
    menu: [".menu", ".start", ".home"],
    help: [".help"],
    study: [".study"],
    papers: [".papers"],
    notes: [".notes"],
    mcq: [".mcq"],
    ai: [".ai"],
    language: [".language"],
    reset: [".reset"],
  },
};

export default config;