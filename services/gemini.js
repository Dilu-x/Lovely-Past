import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/config.js";
import logger from "../utils/logger.js";
import scraper from "./geminiScraper.js";

const SYSTEM_INSTRUCTION = `You are A/L Insight Bot, an AI study assistant for Sri Lankan Advanced Level (A/L) students.

ROLE:
- Explain A/L concepts clearly at the correct level
- Solve A/L questions with step-by-step solutions when needed
- Explain formulas and their applications
- Help with Physics, Chemistry, Biology, Combined Mathematics, ICT, Accounting, Economics, Business Studies
- Generate study notes and summaries
- Generate A/L-level MCQs when requested
- Explain past-paper questions and common mistakes

LANGUAGE RULES (CRITICAL):
- ALWAYS reply in the same language used by the user's message
- Detect the dominant language if the user mixes languages
- Supported: English, Tamil, Sinhala. Reply naturally, including Tanglish/Singlish-style mixing if the user does that
- Do not force English. Do not translate the user's message
- Educational terminology may stay in English when that is standard for A/L

RULES:
- Never invent a PDF, link, or question paper
- Never claim something is official unless verified; clearly say when something needs verification
- If you don't know something, say so honestly
- Prioritize educational accuracy over entertaining responses
- Keep simple questions short; give detail only when required
- No excessive emojis, no huge introductions, no repeating the user's question, no fake motivational speeches, no unnecessary disclaimers
- Format formulas and steps clearly`;

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.sessions = new Map();
    this.ready = false;
  }

  cleanResponse(text) {
    return text
      .replace(/https?:\/\/googleusercontent\.com\/[^\s]+/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  initialize() {
    if (config.ai.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(config.ai.apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: config.ai.model,
          systemInstruction: SYSTEM_INSTRUCTION,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 4096,
          },
        });
        logger.success("Gemini AI initialized");
      } catch (err) {
        logger.error("Gemini initialization failed:", err.message);
      }
    } else {
      logger.warn("GEMINI_API_KEY is not set. Vision (image) features will be unavailable.");
    }

    this.ready = Boolean(config.ai.apiKey || config.ai.apiUrl || config.ai.provider === "scraper");
    if (this.ready) {
      logger.success(`AI provider ready (${config.ai.provider})`);
    } else {
      logger.warn("No AI provider configured. Set AI_API_KEY, GEMINI_API_KEY or AI_PROVIDER=scraper.");
    }
    return this.ready;
  }

  getSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, { history: [], lastUsed: Date.now() });
    }
    return this.sessions.get(userId);
  }

  clearHistory(userId) {
    this.sessions.delete(userId);
  }

  async callShyracore(prompt) {
    if (!config.ai.apiKeyUrl || !config.ai.apiUrl) return null;

    const url = new URL(config.ai.apiUrl);
    url.searchParams.set("prompt", prompt);
    url.searchParams.set("apikey", config.ai.apiKeyUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "User-Agent": "A/L-Insight-Bot/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        logger.error(`Shyracore API error: HTTP ${res.status}`);
        return null;
      }

      const json = await res.json();
      const text = json?.data?.text;
      if (typeof text !== "string" || !text.trim()) {
        logger.error("Shyracore API returned empty response");
        return null;
      }
      return text.trim();
    } catch (err) {
      logger.error("Shyracore API request failed:", err.message);
      return null;
    }
  }

  buildShyracorePrompt(message) {
    return `${SYSTEM_INSTRUCTION}

Conversation history:
${message.history || ""}

User: ${message.text}`;
  }

  async generateResponse(userId, message) {
    if (!this.ready) return null;
    const session = this.getSession(userId);

    const historyText = session.history
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
      .join("\n");

    let text = null;

    if (config.ai.provider === "scraper") {
      text = await scraper.askText(
        this.buildShyracorePrompt({ text: message, history: historyText }),
      );
    }

    if (text === null && (config.ai.provider === "shyracore" || config.ai.apiUrl)) {
      text = await this.callShyracore(
        this.buildShyracorePrompt({ text: message, history: historyText }),
      );
    }

    if (text === null && this.model) {
      try {
        const chat = this.model.startChat({
          history: session.history.map((h) => ({
            role: h.role,
            parts: [{ text: h.content }],
          })),
        });
        const result = await chat.sendMessage(message);
        text = result.response.text().trim();
      } catch (err) {
        logger.error("Gemini generateResponse failed:", err.message);
        return null;
      }
    }

    if (text === null) return null;

    text = this.cleanResponse(text);

    session.history.push({ role: "user", content: message });
    session.history.push({ role: "model", content: text });
    session.lastUsed = Date.now();

    const max = config.ai.maxHistory * 2;
    if (session.history.length > max) {
      session.history = session.history.slice(-max);
    }

    return text;
  }

  async analyzeImage(userId, imageBuffer, mimeType, caption) {
    if (!this.model) return null;

    try {
      const visionModel = this.genAI.getGenerativeModel({
        model: config.ai.model,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      });

      const prompt = caption
        ? `Analyze this image (a study question) and answer it at A/L level.\nUser caption: ${caption}`
        : `Analyze this image (a study question) and answer it at A/L level.`;

      const result = await visionModel.generateContent([
        prompt,
        { inlineData: { data: imageBuffer.toString("base64"), mimeType } },
      ]);
      const text = this.cleanResponse(result.response.text().trim());

      const session = this.getSession(userId);
      session.history.push({ role: "user", content: "[Image question]" });
      session.history.push({ role: "model", content: text });
      session.lastUsed = Date.now();

      return text;
    } catch (err) {
      logger.error("Gemini analyzeImage failed:", err.message);
      return null;
    }
  }

  async generateMCQ(userId, subject, language) {
    const prompt = `Generate 5 A/L-level multiple choice questions for the subject "${subject}".
Format each question as:
Q1. <question>
A) <option>
B) <option>
C) <option>
D) <option>

At the end, give the answer key in this exact format:
ANSWERS: 1-A 2-B 3-C 4-D 5-A
Reply in ${language}. Do not add extra text before or after.`;

    if (config.ai.provider === "scraper") {
      const text = await scraper.askText(this.buildShyracorePrompt({ text: prompt, history: "" }));
      return text ? this.cleanResponse(text) : null;
    }
    if (config.ai.apiUrl) {
      const text = await this.callShyracore(this.buildShyracorePrompt({ text: prompt, history: "" }));
      return text ? this.cleanResponse(text) : null;
    }
    if (!this.model) return null;

    try {
      const chat = this.model.startChat({ history: [] });
      const result = await chat.sendMessage(prompt);
      return this.cleanResponse(result.response.text().trim());
    } catch (err) {
      logger.error("Gemini generateMCQ failed:", err.message);
      return null;
    }
  }

  async checkMCQAnswers(userId, subject, questions, answers) {
    const prompt = `The following 5 MCQs were generated for "${subject}":
${questions}

The student answered: ${answers}

Check each answer. For each question say whether it is correct or wrong, briefly explain the correct answer, and give a total score out of 5. Reply in the same language as the questions.`;

    if (config.ai.provider === "scraper") {
      const text = await scraper.askText(this.buildShyracorePrompt({ text: prompt, history: "" }));
      return text ? this.cleanResponse(text) : null;
    }
    if (config.ai.apiUrl) {
      const text = await this.callShyracore(this.buildShyracorePrompt({ text: prompt, history: "" }));
      return text ? this.cleanResponse(text) : null;
    }
    if (!this.model) return null;

    try {
      const chat = this.model.startChat({ history: [] });
      const result = await chat.sendMessage(prompt);
      return this.cleanResponse(result.response.text().trim());
    } catch (err) {
      logger.error("Gemini checkMCQAnswers failed:", err.message);
      return null;
    }
  }
}

export default new GeminiService();