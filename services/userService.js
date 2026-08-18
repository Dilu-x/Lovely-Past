import fs from "fs";
import path from "path";
import config from "../config/config.js";
import logger from "../utils/logger.js";
import { normalizeLang } from "../utils/language.js";

const usersFile = () => path.join(config.data.dir, config.data.users);

class UserService {
  constructor() {
    this.users = {};
    this.sessions = new Map();
    this.load();
  }

  load() {
    try {
      const file = usersFile();
      if (fs.existsSync(file)) {
        this.users = JSON.parse(fs.readFileSync(file, "utf-8")) || {};
      }
    } catch (err) {
      logger.error("Failed to load users.json:", err.message);
      this.users = {};
    }
  }

  save() {
    try {
      fs.writeFileSync(usersFile(), JSON.stringify(this.users, null, 2));
    } catch (err) {
      logger.error("Failed to save users.json:", err.message);
    }
  }

  getLanguage(jid) {
    const lang = this.users[jid]?.language;
    return lang || null;
  }

  setLanguage(jid, lang) {
    const code = normalizeLang(lang);
    this.users[jid] = { jid, language: code };
    this.save();
    return code;
  }

  isNewUser(jid) {
    return !this.users[jid];
  }

  getSession(jid) {
    if (!this.sessions.has(jid)) {
      this.sessions.set(jid, {});
    }
    return this.sessions.get(jid);
  }

  setSession(jid, data) {
    this.sessions.set(jid, { ...this.getSession(jid), ...data });
  }

  clearSession(jid) {
    this.sessions.delete(jid);
  }

  cleanupOldSessions(maxAge = 6 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [jid, session] of this.sessions.entries()) {
      if (session._ts && now - session._ts > maxAge) {
        this.sessions.delete(jid);
      }
    }
  }
}

export default new UserService();