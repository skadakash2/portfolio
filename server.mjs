import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { readFile as readBody } from "node:fs/promises";

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { sendMail } from "./send-mail.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const port = Number(process.env.PORT || 5000);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
};

createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (req.method === "POST" && pathname === "/contact") {
    try {
      let body = "";
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);
      await sendMail(data);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      console.error("Contact send failed:", error);
      const message = error instanceof Error ? error.message : "Failed to send message";
      const statusCode = message.toLowerCase().includes("invalid email") ? 400 : 500;
      res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: message }));
    }
    return;
  }

  const rawPath = pathname;
  const safePath = normalize(rawPath === "/" ? "/index.html" : rawPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Portfolio server running at http://127.0.0.1:${port}/`);
});
