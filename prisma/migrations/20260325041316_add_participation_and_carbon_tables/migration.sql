-- CreateTable
CREATE TABLE "csr_activity_participations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "csr_activity_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'participation',
    "amount" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "transaction_reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csr_activity_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_certificate_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "certificate_provider" TEXT NOT NULL DEFAULT 'IDX_CARBON',
    "co2_equivalent" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "batch_id" TEXT,
    "certificate_id" TEXT,
    "purchase_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_certificate_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "csr_activity_participations_user_id_idx" ON "csr_activity_participations"("user_id");

-- CreateIndex
CREATE INDEX "csr_activity_participations_csr_activity_id_idx" ON "csr_activity_participations"("csr_activity_id");

-- CreateIndex
CREATE INDEX "csr_activity_participations_status_idx" ON "csr_activity_participations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "csr_activity_participations_user_id_csr_activity_id_key" ON "csr_activity_participations"("user_id", "csr_activity_id");

-- CreateIndex
CREATE INDEX "carbon_certificate_purchases_user_id_idx" ON "carbon_certificate_purchases"("user_id");

-- CreateIndex
CREATE INDEX "carbon_certificate_purchases_status_idx" ON "carbon_certificate_purchases"("status");

-- CreateIndex
CREATE INDEX "carbon_certificate_purchases_certificate_provider_idx" ON "carbon_certificate_purchases"("certificate_provider");

-- AddForeignKey
ALTER TABLE "csr_activity_participations" ADD CONSTRAINT "csr_activity_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csr_activity_participations" ADD CONSTRAINT "csr_activity_participations_csr_activity_id_fkey" FOREIGN KEY ("csr_activity_id") REFERENCES "csr_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_certificate_purchases" ADD CONSTRAINT "carbon_certificate_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
