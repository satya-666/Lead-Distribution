-- RenameIndex
ALTER INDEX "allocation_state_service_pool_unique" RENAME TO "AllocationState_serviceId_poolKey_key";

-- RenameIndex
ALTER INDEX "lead_phone_service_unique" RENAME TO "Lead_phone_serviceId_key";

-- RenameIndex
ALTER INDEX "lead_provider_unique" RENAME TO "LeadAssignment_leadId_providerId_key";
