// ════════════════════════════════════════════════
//  Perplexity Proxy  —  Cloudflare Worker
//  Makes the script API reachable from your website
//  by adding CORS headers. Free to deploy.
//
//  Deploy:
//   1. Go to dash.cloudflare.com -> Workers & Pages -> Create -> Worker
//   2. Replace the default code with everything in this file
//   3. Deploy, copy your worker URL
//      (e.g. https://perplexity-proxy.YOURNAME.workers.dev)
//   4. In perplexity.html set:
//        const MY_PROXY = "https://perplexity-proxy.YOURNAME.workers.dev/?url=";
// ════════════════════════════════════════════════

const ALLOWED_HOST = "scriptblox.com";

export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");

    if (!target) {
      return new Response("Missing ?url=", { status: 400, headers: cors });
    }

    // only allow proxying the script API, nothing else
    let parsed;
    try { parsed = new URL(target); } catch {
      return new Response("Bad url", { status: 400, headers: cors });
    }
    if (!parsed.hostname.endsWith(ALLOWED_HOST)) {
      return new Response("Host not allowed", { status: 403, headers: cors });
    }

    try {
      const upstream = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "*/*" },
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...cors,
          "Content-Type": upstream.headers.get("Content-Type") || "text/plain",
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch (e) {
      return new Response("Upstream error: " + e.message, { status: 502, headers: cors });
    }
  },
};
