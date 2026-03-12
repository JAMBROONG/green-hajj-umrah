-- CreateTable
CREATE TABLE "hajj_periods" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "registration_open_date" TIMESTAMP(3) NOT NULL,
    "registration_close_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hajj_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hajj_periods_year_key" ON "hajj_periods"("year");

-- CreateIndex
CREATE INDEX "hajj_periods_year_idx" ON "hajj_periods"("year");

-- CreateIndex
CREATE INDEX "hajj_periods_is_active_idx" ON "hajj_periods"("is_active");
