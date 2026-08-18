import https from "https";
import logger from "../utils/logger.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function request(options, body, cookieJar) {
  return new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}), "user-agent": UA };
    if (cookieJar && cookieJar.length > 0) {
      headers.cookie = cookieJar.join("; ");
    }

    const req = https.request(
      { ...options, headers, maxHeaderSize: 65536 },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (cookieJar && res.headers["set-cookie"]) {
            for (const c of res.headers["set-cookie"]) {
              const name = c.split(";")[0];
              const idx = cookieJar.findIndex((k) => k.split("=")[0] === name.split("=")[0]);
              if (idx >= 0) cookieJar.splice(idx, 1);
              cookieJar.push(name);
            }
          }

          const text = Buffer.concat(chunks).toString("utf-8");

          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
            const location = res.headers.location;
            if (location) {
              const url = new URL(location, "https://gemini.google.com");
              return request(
                {
                  hostname: url.hostname,
                  path: url.pathname + url.search,
                  method: options.method,
                  headers,
                },
                body,
                cookieJar,
              ).then(resolve, reject);
            }
          }

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          resolve(text);
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

class GeminiScraperClient {
  constructor() {
    this.s = null;
    this.r = 1;
    this.cookies = [];
  }

  async init() {
    const h = await request(
      {
        hostname: "gemini.google.com",
        path: "/",
        method: "GET",
        headers: { "user-agent": UA },
      },
      null,
      this.cookies,
    );

    this.s = {
      a: h.match(/"SNlM0e":"(.*?)"/)?.[1] || "",
      b: h.match(/"cfb2h":"(.*?)"/)?.[1] || "",
      c: h.match(/"FdrFJe":"(.*?)"/)?.[1] || "",
    };

    if (!this.s.a || !this.s.b || !this.s.c) {
      logger.warn("Gemini scraper: could not extract all tokens");
    }

    logger.success("Gemini scraper initialized");
    return this.s;
  }

  async ask(m) {
    if (!this.s) await this.init();

    const p = [null, JSON.stringify([[m, 0, null, null, null, null, 0]])];
    const q = new URLSearchParams({
      bl: this.s.b,
      "f.sid": this.s.c,
      hl: "id",
      _reqid: this.r++,
      rt: "c",
    });

    const body = `f.req=${encodeURIComponent(JSON.stringify(p))}&at=${this.s.a}`;

    const text = await request(
      {
        hostname: "gemini.google.com",
        path: `/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?${q}`,
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "x-same-domain": "1",
        },
      },
      body,
      this.cookies,
    );

    return this.parse(text);
  }

  parse(t) {
    let l = null;
    for (const ln of t.split("\n").filter((x) => x.startsWith('[["wrb.fr"'))) {
      try {
        const d = JSON.parse(JSON.parse(ln)[0][2]);
        if (d[4]?.[0]?.[1]) {
          l = {
            text: Array.isArray(d[4][0][1]) ? d[4][0][1][0] : d[4][0][1],
          };
        }
      } catch (e) {
        /* skip malformed lines */
      }
    }
    return l;
  }

  async askText(message) {
    try {
      const result = await this.ask(message);
      if (!result?.text || !result.text.trim()) {
        logger.error("Gemini scraper returned empty response");
        return null;
      }
      return result.text.trim();
    } catch (err) {
      logger.error("Gemini scraper request failed:", err.message);
      return null;
    }
  }

  reset() {
    this.s = null;
    this.r = 1;
    this.cookies = [];
  }
}

export default new GeminiScraperClient();