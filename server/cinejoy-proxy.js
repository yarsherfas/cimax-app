/*
 * Proxy inverse pour cinejoy.to
 * Le site envoie x-frame-options: DENY et content-security-policy: frame-ancestors 'none',
 * ce qui empêche toute intégration en iframe. Ce proxy sert les pages en retirant
 * ces en-têtes. Monté sur son propre port (origine dédiée), toutes les sous-requêtes
 * relatives de la page (/_app/..., /assets/...) repassent automatiquement par lui.
 *
 * - Démarrage autonome : `npm run proxy` (utilise PROXY_PORT ou PORT, ex. Wasmer)
 * - Démarrage intégré  : chargé par instrumentation.ts au boot du serveur Next
 */
const http = require("http");
const https = require("https");

const TARGET_HOST = "cinejoy.to";
const FALLBACK_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// En-têtes de réponse à retirer pour lever le blocage d'intégration en iframe
const STRIP_HEADERS = [
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
];

function proxyRequest(req, res, path, redirectsLeft) {
  const options = {
    method: req.method,
    headers: {
      "User-Agent": req.headers["user-agent"] || FALLBACK_UA,
      Accept: req.headers.accept || "*/*",
      "Accept-Language": req.headers["accept-language"] || "en-US,en;q=0.9",
      Referer: `https://${TARGET_HOST}/`,
      Origin: `https://${TARGET_HOST}`,
      Host: TARGET_HOST,
      ...(req.headers.cookie ? { Cookie: req.headers.cookie } : {}),
    },
  };

  const upstreamReq = https.request(
    `https://${TARGET_HOST}${path}`,
    options,
    (up) => {
      const status = up.statusCode || 502;
      const location = up.headers.location;

      // Suit les redirections en interne : renvoyer le 3xx tel quel ferait
      // naviguer le navigateur directement vers cinejoy.to, donc le blocage.
      if ([301, 302, 303, 307, 308].includes(status) && location && redirectsLeft > 0) {
        up.resume();
        let target = null;
        try {
          target = new URL(location, `https://${TARGET_HOST}`);
        } catch {
          target = null;
        }
        if (target && target.host === TARGET_HOST) {
          return proxyRequest(req, res, target.pathname + target.search, redirectsLeft - 1);
        }
        res.writeHead(status, { Location: location });
        return res.end();
      }

      const headers = { ...up.headers };
      for (const h of STRIP_HEADERS) delete headers[h];
      headers["access-control-allow-origin"] = "*";
      res.writeHead(status, headers);
      up.pipe(res);
    }
  );

  upstreamReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end(`Proxy Error: ${err.message}`);
  });

  req.pipe(upstreamReq);
}

function start(port = Number(process.env.PROXY_PORT) || 3001) {
  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "*",
      });
      return res.end();
    }
    proxyRequest(req, res, req.url, 5);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`⚠ cinejoy-proxy : port ${port} déjà occupé (proxy déjà lancé ?)`);
    } else {
      console.error("cinejoy-proxy :", err.message);
    }
  });

  server.listen(port, () => {
    console.log(`🚀 cinejoy-proxy prêt : http://localhost:${port} → https://${TARGET_HOST}`);
  });
  return server;
}

if (require.main === module) {
  start(Number(process.env.PROXY_PORT) || Number(process.env.PORT) || 3001);
}

module.exports = { start };
