import fs from "fs";
import path from "path";
import config from "../config/config.js";
import logger from "../utils/logger.js";

class PaperService {
  constructor() {
    this.cache = {
      papers: null,
      notes: null,
      "model-papers": null,
    };
  }

  filePath(type) {
    const files = {
      papers: config.data.papers,
      notes: config.data.notes,
      "model-papers": config.data.modelPapers,
    };
    return path.join(config.data.dir, files[type] || files.papers);
  }

  load(type) {
    if (this.cache[type] !== null) return this.cache[type];
    try {
      const file = this.filePath(type);
      if (!fs.existsSync(file)) {
        logger.warn(`Data file not found: ${file}`);
        this.cache[type] = {};
        return {};
      }
      const data = JSON.parse(fs.readFileSync(file, "utf-8"));
      this.cache[type] = data || {};
      return this.cache[type];
    } catch (err) {
      logger.error(`Failed to load ${type}.json:`, err.message);
      this.cache[type] = {};
      return {};
    }
  }

  reload() {
    this.cache = { papers: null, notes: null, "model-papers": null };
    this.load("papers");
    this.load("notes");
    this.load("model-papers");
    logger.success("Paper data reloaded");
  }

  getYears(type = "papers") {
    const data = this.load(type);
    return Object.keys(data).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }

  getMediums(year, type = "papers") {
    const data = this.load(type);
    const mediums = data[year] || {};
    return Object.keys(mediums).filter((m) => Object.keys(mediums[m] || {}).length > 0);
  }

  getSubjects(year, medium, type = "papers") {
    const data = this.load(type);
    const mediumData = data[year]?.[medium] || {};
    return Object.keys(mediumData).filter(
      (subject) => Array.isArray(mediumData[subject]) && mediumData[subject].length > 0,
    );
  }

  getPapers(year, medium, subject, type = "papers") {
    const data = this.load(type);
    return data[year]?.[medium]?.[subject] || [];
  }

  getPaper(year, medium, subject, paperId, type = "papers") {
    const papers = this.getPapers(year, medium, subject, type);
    return papers.find((p) => String(p.id) === String(paperId)) || papers[0] || null;
  }

  hasData(year, medium, subject, type = "papers") {
    return this.getPapers(year, medium, subject, type).length > 0;
  }
}

export default new PaperService();