import { createReadStream, existsSync, statSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 3000);
const convexTarget =
  process.env.VITE_CONVEX_SITE_URL ||
  process.env.VITE_CONVEX_URL ||
  process.env.CONVEX_URL ||
  "http://localhost:3000";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function sendFile(res, filePath) {
  res.writeHead(200, { "Content-Type": getContentType(filePath) });
  createReadStream(filePath).pipe(res);
}

async function readFallbackHtml() {
  return fs.readFile(path.join(distDir, "index.html"), "utf8");
}

function proxyApiRequest(req, res) {
  const targetUrl = new URL(convexTarget);
  const client = targetUrl.protocol === "https:" ? https : http;
  const rewriteMap = new Map([
    ["/api/auth/callback", "/auth/callback"],
    ["/api/auth/admin-check", "/auth/adminCheck"],
    ["/api/auth/invites", "/auth/invites"],
    ["/api/admin/register-if-authorized", "/admin/registerIfAuthorized"],
    ["/api/admin/invites", "/admin/invites"],
    ["/api/admin/generate-invite", "/admin/generateInvite"],
    ["/api/admin/zipline-invites", "/admin/zipline-invites"],
    ["/api/ids", "/ids"],
  ]);

  const rewrittenPath = rewriteMap.get(req.url || "") || (req.url || "").replace(/^\/api/, "");
  const requestPath = `${targetUrl.pathname.replace(/\/$/, "")}${rewrittenPath}`;
  const headers = { ...req.headers, host: targetUrl.host };
  delete headers["content-length"];
  delete headers["connection"];

  const proxyReq = client.request(
    {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || undefined,
      method: req.method,
      path: requestPath,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Proxy request failed", detail: error.message }));
  });

  req.pipe(proxyReq);
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url || "/", "http://localhost");

  if (requestUrl.pathname.startsWith("/api/")) {
    proxyApiRequest(req, res);
    return;
  }

  const publicPath = path.join(distDir, decodeURIComponent(requestUrl.pathname));

  if (existsSync(publicPath)) {
    const fileStat = statSync(publicPath);
    if (fileStat.isFile()) {
      sendFile(res, publicPath);
      return;
    }
  }

  const indexHtml = await readFallbackHtml();
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(indexHtml);
}

if (!existsSync(distDir)) {
  console.error("Missing dist directory. Run npm run build before starting the server.");
  process.exit(1);
}

http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Internal server error", detail: error.message }));
  });
}).listen(port, () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
  console.log(`Proxying /api to ${convexTarget}`);
});
