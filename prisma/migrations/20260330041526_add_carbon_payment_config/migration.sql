-- CreateTable
CREATE TABLE "CarbonPaymentConfig" (
    "id" TEXT NOT NULL,
    "midtrans_server_key" TEXT NOT NULL,
    "midtrans_client_key" TEXT NOT NULL,
    "midtrans_merchant_id" TEXT NOT NULL,
    "is_production" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarbonPaymentConfig_pkey" PRIMARY KEY ("id")
);

