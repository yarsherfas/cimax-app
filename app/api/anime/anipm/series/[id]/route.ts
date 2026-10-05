import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ANIPM_API = "https://ani.pm/api/partner/v1";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const by = req.nextUrl.searchParams.get("by") || "ani";

  const upstreamId = by === "mal" ? `mal-${id}` : id;

  try {
    const res = await fetch(`${ANIPM_API}/series/${upstreamId}`, {
      next: { revalidate: 600 },
      headers: { Accept: "application/json" },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const code = body?.error?.code ?? "upstream-error";
      const message = body?.error?.message ?? `ani.pm ${res.status}`;
      return NextResponse.json({ error: { code, message } }, { status: res.status });
    }

    // ani.pm returns { data: { anilistId, malId, title, ..., episodeList } }
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach ani.pm";
    return NextResponse.json({ error: { code: "network-error", message } }, { status: 502 });
  }
}
