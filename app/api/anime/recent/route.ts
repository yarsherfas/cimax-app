import { NextRequest, NextResponse } from "next/server";
import { mapAnikotoList } from "@/lib/anime";

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get("page") || "1";
  const perPage = req.nextUrl.searchParams.get("per_page") || "24";

  try {
    const res = await fetch(
      `https://anikotoapi.site/recent-anime?page=${page}&per_page=${perPage}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Anikoto unavailable" }, { status: 502 });
    }

    const data = await res.json();
    const items = mapAnikotoList(data.data || []).filter(item => item.poster);

    return NextResponse.json({
      items,
      page: data.pagination?.page ?? Number(page),
      totalPages: data.pagination?.total_pages ?? 1,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch anime" }, { status: 500 });
  }
}
