import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/*
 * Redirige silencieusement vers le proxy cinejoy (app/api/cinejoy) :
 * - /watch/*   : les pages de lecture chargées dans l'iframe
 * - /_app/*    : les assets SvelteKit de cinejoy, demandés en chemins
 *                racine par la page — un dossier app/_app/ serait ignoré
 *                par le routeur de Next (dossier privé), d'où la réécriture.
 */
export function proxy(req: NextRequest) {
  return NextResponse.rewrite(
    new URL(`/api/cinejoy${req.nextUrl.pathname}${req.nextUrl.search}`, req.url)
  );
}

export const config = {
  matcher: ["/watch/:path*", "/_app/:path*"],
};
