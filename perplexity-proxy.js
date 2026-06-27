// ════════════════════════════════════════════════
//  Perplexity Relay — Cloudflare Worker
//  Makes search + script copy + game photos work.
//
//  SETUP (about 2 minutes, free, no card):
//   1. Go to dash.cloudflare.com
//   2. Left menu: "Workers & Pages" -> "Create" -> "Create Worker"
//   3. Name it (e.g. perplexity-relay) -> Deploy
//   4. Click "Edit code", DELETE everything in the editor,
//      paste EVERYTHING from this file, then "Deploy" again
//   5. Copy your worker URL at the top
//      (looks like: https://perplexity-relay.YOURNAME.workers.dev)
//   6. In index.html find the line:  const MY_PROXY = "";
//      change it to: const MY_PROXY = "https://perplexity-relay.YOURNAME.workers.dev/?url=";
//   7. Re-upload index.html to GitHub. Railway redeploys. Done.
// ════════════════════════════════════════════════

const ALLOWED = ["scriptblox.com", "thumbnails.roblox.com", "roblox.com"];

export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");
    if (!target) return new Response("Missing ?url=", { status: 400, headers: cors });

    let parsed;
    try { parsed = new URL(target); } catch { return new Response("Bad url", { status: 400, headers: cors }); }
    if (!ALLOWED.some(h => parsed.hostname.endsWith(h)))
      return new Response("Host not allowed", { status: 403, headers: cors });

    try {
      const upstream = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "*/*" },
      });
      const ct = upstream.headers.get("Content-Type") || "text/plain";
      // images: pass bytes through; text/json: pass text
      const body = ct.startsWith("image/")
        ? await upstream.arrayBuffer()
        : await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { ...cors, "Content-Type": ct, "Cache-Control": "public, max-age=300" },
      });
    } catch (e) {
      return new Response("Upstream error: " + e.message, { status: 502, headers: cors });
    }
  },
};
