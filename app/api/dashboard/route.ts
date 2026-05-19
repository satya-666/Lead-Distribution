import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    include: {
      assignments: {
        orderBy: { createdAt: "desc" },
        include: {
          lead: {
            include: {
              service: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    providers: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      monthlyQuota: provider.monthlyQuota,
      usedQuota: provider.usedQuota,
      remainingQuota: Math.max(provider.monthlyQuota - provider.usedQuota, 0),
      leadsReceivedCount: provider.assignments.length,
      leads: provider.assignments.map((assignment) => ({
        id: assignment.lead.id,
        assignmentId: assignment.id,
        name: assignment.lead.name,
        phone: assignment.lead.phone,
        city: assignment.lead.city,
        serviceName: assignment.lead.service.name,
        description: assignment.lead.description,
        assignedAt: assignment.createdAt,
      })),
    })),
  });
}
