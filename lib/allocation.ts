import { Prisma, type Lead, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publishDashboardUpdate } from "@/lib/realtime";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type LeadInput = {
  name: string;
  phone: string;
  city: string;
  serviceName: string;
  description: string;
};

type AllocationRule = {
  mandatoryProviders: string[];
  poolProviders: string[];
};

type AllocationStateRow = {
  id: string;
  nextIndex: number;
};

type ProviderRow = {
  id: string;
  name: string;
  monthlyQuota: number;
  usedQuota: number;
};

type UpdatedProviderRow = {
  id: string;
};

export const ALLOCATION_RULES: Record<string, AllocationRule> = {
  "Service 1": {
    mandatoryProviders: ["Provider 1"],
    poolProviders: ["Provider 2", "Provider 3", "Provider 4"],
  },
  "Service 2": {
    mandatoryProviders: ["Provider 5"],
    poolProviders: ["Provider 6", "Provider 7", "Provider 8"],
  },
  "Service 3": {
    mandatoryProviders: ["Provider 1", "Provider 4"],
    poolProviders: ["Provider 2", "Provider 3", "Provider 5", "Provider 6", "Provider 7", "Provider 8"],
  },
};

const PROVIDERS_PER_LEAD = 3;
const DEFAULT_POOL_KEY = "default";

export class DuplicateLeadError extends Error {
  constructor() {
    super("A lead already exists for this phone number and service.");
    this.name = "DuplicateLeadError";
  }
}

export class AllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AllocationError";
  }
}

export async function createLeadAndAllocate(input: LeadInput) {
  const normalized = normalizeLeadInput(input);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const service = await tx.service.findUnique({
          where: { name: normalized.serviceName },
        });

        if (!service) {
          throw new AllocationError("Selected service does not exist.");
        }

        const lead = await tx.lead.create({
          data: {
            name: normalized.name,
            phone: normalized.phone,
            city: normalized.city,
            description: normalized.description,
            serviceId: service.id,
          },
        });

        await allocateLeadInTransaction(tx, lead, service.name, service.id);

        return lead;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    publishDashboardUpdate();
    return result;
  } catch (error) {
    if (isUniqueLeadViolation(error)) {
      throw new DuplicateLeadError();
    }

    throw error;
  }
}

async function allocateLeadInTransaction(
  tx: TxClient,
  lead: Lead,
  serviceName: string,
  serviceId: string,
) {
  const rule = ALLOCATION_RULES[serviceName];

  if (!rule) {
    throw new AllocationError(`No allocation rule configured for ${serviceName}.`);
  }

  const uniqueMandatory = dedupe(rule.mandatoryProviders);
  const neededFromPool = PROVIDERS_PER_LEAD - uniqueMandatory.length;

  if (neededFromPool < 0) {
    throw new AllocationError("Mandatory provider count exceeds assignment limit.");
  }

  const state = await lockAllocationState(tx, serviceId);
  const providerNames = dedupe([...uniqueMandatory, ...rule.poolProviders]);
  const providers = await lockProvidersByName(tx, providerNames);
  const providerByName = new Map(providers.map((provider) => [provider.name, provider]));

  const selected: ProviderRow[] = [];

  for (const providerName of uniqueMandatory) {
    const provider = providerByName.get(providerName);

    if (!provider) {
      throw new AllocationError(`Mandatory provider ${providerName} was not seeded.`);
    }

    if (provider.usedQuota >= provider.monthlyQuota) {
      throw new AllocationError(`${providerName} has no remaining quota.`);
    }

    selected.push(provider);
  }

  const poolSelection = selectFromPool({
    poolProviderNames: rule.poolProviders,
    providerByName,
    alreadySelectedIds: new Set(selected.map((provider) => provider.id)),
    startIndex: state.nextIndex,
    needed: neededFromPool,
  });

  selected.push(...poolSelection.providers);

  if (selected.length !== PROVIDERS_PER_LEAD) {
    throw new AllocationError("Unable to allocate exactly three providers for this lead.");
  }

  for (const provider of selected) {
    await incrementQuota(tx, provider.id);
  }

  await tx.leadAssignment.createMany({
    data: selected.map((provider) => ({
      leadId: lead.id,
      providerId: provider.id,
    })),
  });

  await tx.allocationState.update({
    where: { id: state.id },
    data: { nextIndex: poolSelection.nextIndex },
  });
}

async function lockAllocationState(tx: TxClient, serviceId: string) {
  const rows = await tx.$queryRaw<AllocationStateRow[]>`
    SELECT id, "nextIndex"
    FROM "AllocationState"
    WHERE "serviceId" = ${serviceId} AND "poolKey" = ${DEFAULT_POOL_KEY}
    FOR UPDATE
  `;

  if (rows[0]) {
    return rows[0];
  }

  const created = await tx.allocationState.create({
    data: {
      serviceId,
      poolKey: DEFAULT_POOL_KEY,
      nextIndex: 0,
    },
  });

  const locked = await tx.$queryRaw<AllocationStateRow[]>`
    SELECT id, "nextIndex"
    FROM "AllocationState"
    WHERE id = ${created.id}
    FOR UPDATE
  `;

  return locked[0];
}

async function lockProvidersByName(tx: TxClient, providerNames: string[]) {
  return tx.$queryRaw<ProviderRow[]>`
    SELECT id, name, "monthlyQuota", "usedQuota"
    FROM "Provider"
    WHERE name IN (${Prisma.join(providerNames)})
    ORDER BY name ASC
    FOR UPDATE
  `;
}

function selectFromPool(args: {
  poolProviderNames: string[];
  providerByName: Map<string, ProviderRow>;
  alreadySelectedIds: Set<string>;
  startIndex: number;
  needed: number;
}) {
  const { poolProviderNames, providerByName, alreadySelectedIds, startIndex, needed } = args;
  const selected: ProviderRow[] = [];
  const poolSize = poolProviderNames.length;

  if (needed === 0) {
    return { providers: selected, nextIndex: startIndex % Math.max(poolSize, 1) };
  }

  if (poolSize === 0) {
    throw new AllocationError("Allocation pool is empty.");
  }

  let inspected = 0;
  let cursor = startIndex % poolSize;

  while (inspected < poolSize && selected.length < needed) {
    const providerName = poolProviderNames[cursor];
    const provider = providerByName.get(providerName);

    if (!provider) {
      throw new AllocationError(`Pool provider ${providerName} was not seeded.`);
    }

    if (!alreadySelectedIds.has(provider.id) && provider.usedQuota < provider.monthlyQuota) {
      selected.push(provider);
      alreadySelectedIds.add(provider.id);
    }

    cursor = (cursor + 1) % poolSize;
    inspected += 1;
  }

  if (selected.length !== needed) {
    throw new AllocationError("Not enough providers with remaining quota in the allocation pool.");
  }

  return { providers: selected, nextIndex: cursor };
}

async function incrementQuota(tx: TxClient, providerId: string) {
  const updated = await tx.$queryRaw<UpdatedProviderRow[]>`
    UPDATE "Provider"
    SET "usedQuota" = "usedQuota" + 1, "updatedAt" = now()
    WHERE id = ${providerId} AND "usedQuota" < "monthlyQuota"
    RETURNING id
  `;

  if (!updated[0]) {
    throw new AllocationError("Provider quota was exhausted during allocation.");
  }
}

function normalizeLeadInput(input: LeadInput) {
  return {
    name: input.name.trim(),
    phone: input.phone.replace(/\s+/g, ""),
    city: input.city.trim(),
    serviceName: input.serviceName.trim(),
    description: input.description.trim(),
  };
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}

function isUniqueLeadViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
