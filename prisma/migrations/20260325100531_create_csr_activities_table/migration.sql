-- CreateTable csr_activities
CREATE TABLE "csr_activities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "registration_deadline" TIMESTAMP(3) NOT NULL,
    "participants_count" INTEGER NOT NULL DEFAULT 0,
    "effort_hours" INTEGER NOT NULL,
    "image_url" TEXT,
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "contact_person" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "incentives" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csr_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "csr_activities_tenant_id_idx" ON "csr_activities"("tenant_id");

-- CreateIndex
CREATE INDEX "csr_activities_status_idx" ON "csr_activities"("status");

-- CreateIndex
CREATE INDEX "csr_activities_category_idx" ON "csr_activities"("category");

-- AddForeignKey
ALTER TABLE "csr_activities" ADD CONSTRAINT "csr_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;