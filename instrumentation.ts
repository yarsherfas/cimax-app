// Lance le proxy cinejoy au démarrage du serveur Next (dev et production),
// pour que l'iframe CineJoy fonctionne sans processus séparé.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { start } = await import("./server/cinejoy-proxy");
    start();
  }
}
