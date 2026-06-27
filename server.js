// ════════════════════════════════════════════════
//  Perplexity server — serves the site AND fetches
//  scripts server-side, so the browser never hits a
//  cross-origin wall. Runs on Railway as-is.
// ════════════════════════════════════════════════

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const API  = "https://scriptblox.com/api";

const TYPES = {
  ".html":"text/html", ".js":"text/javascript", ".css":"text/css",
  ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml", ".ico":"image/x-icon",
};

async function passJson(res, url){
  try{
    const r = await fetch(url, { headers:{ "User-Agent":"Mozilla/5.0", "Accept":"*/*" } });
    const body = await r.text();
    res.writeHead(r.status, { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" });
    res.end(body);
  }catch(e){
    res.writeHead(502, { "Content-Type":"application/json" });
    res.end(JSON.stringify({ message:"upstream error: "+e.message }));
  }
}

async function passText(res, url){
  try{
    const r = await fetch(url, { headers:{ "User-Agent":"Mozilla/5.0", "Accept":"*/*" } });
    const body = await r.text();
    res.writeHead(r.status, { "Content-Type":"text/plain; charset=utf-8", "Access-Control-Allow-Origin":"*" });
    res.end(body);
  }catch(e){
    res.writeHead(502); res.end("upstream error: "+e.message);
  }
}

async function passImage(res, url){
  try{
    const r = await fetch(url, { headers:{ "User-Agent":"Mozilla/5.0" } });
    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(r.status, { "Content-Type": r.headers.get("content-type")||"image/png",
      "Access-Control-Allow-Origin":"*", "Cache-Control":"public, max-age=86400" });
    res.end(buf);
  }catch(e){
    res.writeHead(502); res.end("img error");
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const p = u.pathname;

  // ── API routes (server-side, no CORS issue) ──
  if (p === "/api/search") {
    const q = u.searchParams.get("q") || "";
    return passJson(res, `${API}/script/search?q=${encodeURIComponent(q)}&max=20`);
  }
  if (p === "/api/trending") {
    return passJson(res, `${API}/script/fetch?sortBy=views&order=desc&max=12`);
  }
  if (p === "/api/raw") {
    const slug = u.searchParams.get("slug") || "";
    return passText(res, `${API}/script/raw/${encodeURIComponent(slug)}`);
  }
  if (p === "/api/gameicon") {
    const id = u.searchParams.get("id") || "";
    return passGameIcon(res, id);
  }

  // ── static files ──
  let file = p === "/" ? "/index.html" : p;
  const full = path.join(__dirname, decodeURIComponent(file));
  if (!full.startsWith(__dirname)) { res.writeHead(403); return res.end("no"); }

  fs.readFile(full, (err, data) => {
    if (err) {
      // fall back to index.html for unknown routes
      fs.readFile(path.join(__dirname, "index.html"), (e2, d2) => {
        if (e2) { res.writeHead(404); return res.end("Not found"); }
        res.writeHead(200, { "Content-Type":"text/html" }); res.end(d2);
      });
      return;
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Perplexity running on ${PORT}`));
