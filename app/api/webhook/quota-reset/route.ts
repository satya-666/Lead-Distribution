import { NextResponse } from "next/server";
import { resetProviderQuotaByWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventId = typeof body?.eventId === "string" ? body.eventId.trim() : "";

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required." }, { status: 400 });
  }

  const result = await resetProviderQuotaByWebhook(eventId);

  return NextResponse.json({
    processed: result.processed,
    event: result.event,
  });
}
