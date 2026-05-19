import { NextResponse } from "next/server";
import { AllocationError, createLeadAndAllocate, DuplicateLeadError } from "@/lib/allocation";

export const dynamic = "force-dynamic";

const VALID_SERVICES = new Set(["Service 1", "Service 2", "Service 3"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validation = validateLeadPayload(body);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const lead = await createLeadAndAllocate(validation.data);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateLeadError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof AllocationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to create lead." }, { status: 500 });
  }
}

function validateLeadPayload(body: unknown):
  | {
      ok: true;
      data: {
        name: string;
        phone: string;
        city: string;
        serviceName: string;
        description: string;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const payload = body as Record<string, unknown>;
  const name = getString(payload.name);
  const phone = getString(payload.phone).replace(/\s+/g, "");
  const city = getString(payload.city);
  const serviceName = getString(payload.serviceName);
  const description = getString(payload.description);

  if (!name || !phone || !city || !serviceName || !description) {
    return { ok: false, error: "All fields are required." };
  }

  if (!/^\+?[0-9]{7,15}$/.test(phone)) {
    return { ok: false, error: "Phone number must contain 7 to 15 digits." };
  }

  if (!VALID_SERVICES.has(serviceName)) {
    return { ok: false, error: "Invalid service selected." };
  }

  return {
    ok: true,
    data: {
      name,
      phone,
      city,
      serviceName,
      description,
    },
  };
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
