import fs from "fs";
import path from "path";
import axios from "axios";
import config from "../config/config.js";
import logger from "../utils/logger.js";

const SUBJECT_LABELS = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  "combined-mathematics": "Combined_Mathematics",
  ict: "ICT",
  accounting: "Accounting",
  economics: "Economics",
  "business-studies": "Business_Studies",
  english: "English",
  sinhala: "Sinhala",
  tamil: "Tamil",
};

const MEDIUM_LABELS = {
  en: "English",
  ta: "Tamil",
  si: "Sinhala",
};

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeName(name) {
  return name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
}

export function buildFileName(type, year, subject, medium) {
  const subjectName = SUBJECT_LABELS[subject] || sanitizeName(subject);
  const mediumName = MEDIUM_LABELS[medium] || sanitizeName(medium);
  const typeName = type === "papers" ? "" : type === "notes" ? "_Notes" : "_Model_Paper";
  return `A-L_Insight_${year}_${subjectName}${typeName}_${mediumName}.pdf`;
}

class DownloadService {
  constructor() {
    this.tempDir = path.resolve(config.rootDir, config.download.tempDir);
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async download(url, fileName) {
    if (!isValidUrl(url)) {
      throw new Error("Invalid URL");
    }

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: config.download.timeout,
      maxContentLength: config.download.maxFileSize,
      maxBodyLength: config.download.maxFileSize,
      headers: {
        "User-Agent": "A/L-Insight-Bot/1.0",
        Accept: "application/pdf,*/*",
      },
    });

    const buffer = Buffer.from(response.data);

    if (buffer.length > config.download.maxFileSize) {
      throw new Error("File too large");
    }

    const safeName = sanitizeName(fileName);
    const filePath = path.join(this.tempDir, `${Date.now()}_${safeName}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  cleanup(filePath) {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      logger.warn("Failed to clean temp file:", err.message);
    }
  }

  cleanupAll(maxAge = 60 * 60 * 1000) {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (err) {
      logger.warn("Temp cleanup failed:", err.message);
    }
  }
}

export default new DownloadService();