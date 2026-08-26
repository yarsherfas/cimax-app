import { NextRequest } from "next/server";

/*
 * Proxy inverse même-origine pour cinejoy.to.
 *
 * Le site bloque l'intégration en iframe (X-Frame-Options: DENY +
 * CSP frame-ancestors 'none'). Ce route handler le sert sous la même
 * origine que l'app en retirant ces en-têtes — indispensable aussi en
 * production : une page publique (HTTPS) n'a pas le droit de charger
 * http://localhost:* dans une iframe (blocage Private Network Access).
 *
 * L'iframe charge /watch/movie/550 ; proxy.ts réécrit /watch/* et /_app/*
 * (assets SvelteKit du site) vers ce handler.
 */

export const dynamic = "force-dynamic";

const TARGET = "https://cinejoy.to";

// En-têtes de réponse à ne jamais renvoyer : blocage iframe, encodage
// (le body est renvoyé décompressé) et métadonnées Cloudflare sans objet.
const DROP_RES_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "vary",
  "strict-transport-security",
  "alt-svc",
  "report-to",
  "nel",
]);

// En-têtes de requête du client utiles en amont (session, cache, plages)
const FORWARD_REQ_HEADERS = [
  "user-agent",
  "accept",
  "accept-language",
  "range",
  "if-none-match",
  "if-modified-since",
  "cookie",
];

async function proxy(req: NextRequest) {
  const raw = req.nextUrl.pathname.replace(/^\/api\/cinejoy/, "");
  const upstream = `${TARGET}${raw}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQ_HEADERS) {
    const v = req.headers.get(name);
    if (v) headers.set(name, v);
  }
  headers.set("referer", "https://cinejoy.to/");

  const upstreamRes = await fetch(upstream, {
    headers,
    redirect: "follow",
    cache: "no-store",
  });

  const resHeaders = new Headers();
  upstreamRes.headers.forEach((value, name) => {
    const n = name.toLowerCase();
    if (n === "set-cookie" || DROP_RES_HEADERS.has(n) || n.startsWith("cf-")) return;
    resHeaders.set(name, value);
  });
  for (const cookie of upstreamRes.headers.getSetCookie()) {
    resHeaders.append("set-cookie", cookie);
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function HEAD(req: NextRequest) {
  return proxy(req);
}
