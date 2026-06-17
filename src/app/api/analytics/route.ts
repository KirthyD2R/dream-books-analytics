import { NextResponse } from "next/server";
import { getDashboardData } from "@/db/analytics";

export const dynamic = "force-dynamic";

/** GET /api/analytics — the same data the dashboard renders, as JSON. */
export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("analytics error", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
