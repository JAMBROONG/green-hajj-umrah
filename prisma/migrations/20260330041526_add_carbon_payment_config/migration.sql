-- CreateTable
CREATE TABLE "CarbonPaymentConfig" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "midtrans_server_key" TEXT NOT NULL,
    "midtrans_client_key" TEXT NOT NULL,
    "midtrans_merchant_id" TEXT NOT NULL,
    "is_production" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarbonPaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarbonPaymentConfig_tenant_id_key" ON "CarbonPaymentConfig"("tenant_id");

-- CreateIndex
CREATE INDEX "CarbonPaymentConfig_tenant_id_idx" ON "CarbonPaymentConfig"("tenant_id");

-- AddForeignKey
ALTER TABLE "CarbonPaymentConfig" ADD CONSTRAINT "CarbonPaymentConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
