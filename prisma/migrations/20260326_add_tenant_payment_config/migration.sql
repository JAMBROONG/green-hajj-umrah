-- CreateTable TenantPaymentConfig
CREATE TABLE "TenantPaymentConfig" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "midtrans_server_key" TEXT NOT NULL,
    "midtrans_client_key" TEXT NOT NULL,
    "midtrans_merchant_id" TEXT NOT NULL,
    "is_production" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantPaymentConfig_tenant_id_key" ON "TenantPaymentConfig"("tenant_id");

-- CreateIndex
CREATE INDEX "TenantPaymentConfig_tenant_id_idx" ON "TenantPaymentConfig"("tenant_id");

-- AddForeignKey
ALTER TABLE "TenantPaymentConfig" ADD CONSTRAINT "TenantPaymentConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
