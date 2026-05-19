import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const services = ["Service 1", "Service 2", "Service 3"];
const providers = Array.from({ length: 8 }, (_, index) => `Provider ${index + 1}`);

async function main() {
  for (const name of services) {
    await prisma.service.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of providers) {
    await prisma.provider.upsert({
      where: { name },
      update: { monthlyQuota: 10 },
      create: { name, monthlyQuota: 10, usedQuota: 0 },
    });
  }

  const seededServices = await prisma.service.findMany({
    where: { name: { in: services } },
  });

  for (const service of seededServices) {
    await prisma.allocationState.upsert({
      where: {
        allocation_state_service_pool_unique: {
          serviceId: service.id,
          poolKey: "default",
        },
      },
      update: {},
      create: {
        serviceId: service.id,
        poolKey: "default",
        nextIndex: 0,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
