import { NextResponse } from "next/server";
import { AllocationError, createLeadAndAllocate, DuplicateLeadError } from "@/lib/allocation";

export const dynamic = "force-dynamic";

const SERVICES = ["Service 1", "Service 2", "Service 3"];

export async function POST() {
  const batchId = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, (_, index) =>
      createLeadAndAllocate({
        name: `Generated Lead ${batchId}-${index + 1}`,
        phone: `900${String(batchId).slice(-6)}${String(index).padStart(2, "0")}`,
        city: ["Delhi", "Mumbai", "Bengaluru"][index % 3],
        serviceName: SERVICES[index % SERVICES.length],
        description: "Generated from the test-tools panel.",
      }),
    ),
  );

  const created = results.filter((result) => result.status === "fulfilled").length;
  const failed = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => ({
      message:
        result.reason instanceof DuplicateLeadError || result.reason instanceof AllocationError
          ? result.reason.message
          : "Unexpected error while generating lead.",
    }));

  return NextResponse.json({ created, failed });
}
