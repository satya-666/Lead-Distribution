import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publishDashboardUpdate } from "@/lib/realtime";

export const QUOTA_RESET_WEBHOOK_TYPE = "provider_quota_reset";

export async function resetProviderQuotaByWebhook(eventId: string) {
  const result = await prisma.$transaction(
    async (tx) => {
      try {
        await tx.webhookEvent.create({
          data: {
            eventId,
            type: QUOTA_RESET_WEBHOOK_TYPE,
            status: "PROCESSING",
            payload: { requestedAt: new Date().toISOString() },
          },
        });
      } catch (error) {
        if (isUniqueWebhookEvent(error)) {
          const existing = await tx.webhookEvent.findUniqueOrThrow({
            where: { eventId },
          });

          return {
            processed: false,
            event: existing,
          };
        }

        throw error;
      }

      await tx.provider.updateMany({
        data: {
          monthlyQuota: 10,
          usedQuota: 0,
        },
      });

      const event = await tx.webhookEvent.update({
        where: { eventId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      return {
        processed: true,
        event,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 20_000,
    },
  );

  if (result.processed) {
    publishDashboardUpdate();
  }

  return result;
}

function isUniqueWebhookEvent(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
