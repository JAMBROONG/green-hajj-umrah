/*
  Warnings:

  - Made the column `total_price` on table `carbon_certificate_purchases` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "TenantPaymentConfig" DROP CONSTRAINT "TenantPaymentConfig_tenant_id_fkey";

-- AlterTable
ALTER TABLE "carbon_certificate_purchases" ALTER COLUMN "total_price" SET NOT NULL;

-- CreateTable
CREATE TABLE "airports" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icao" TEXT,
    "iata" TEXT,
    "country" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seaports" (
    "id" SERIAL NOT NULL,
    "source_id" INTEGER,
    "name" TEXT NOT NULL,
    "alias_name" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "province" TEXT,
    "city" TEXT,
    "address" TEXT,
    "country_id" INTEGER,
    "country_code" TEXT NOT NULL DEFAULT 'ID',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seaports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "factor_emission" DECIMAL(10,4) NOT NULL,
    "factor_emission_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_kendaraan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "emission_factor" DECIMAL(12,6),
    "type" TEXT NOT NULL,
    "emission_factor_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jenis_kendaraan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faktor_emisi_makanan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "emission_factor" DECIMAL(10,4) NOT NULL,
    "emission_factor_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faktor_emisi_makanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faktor_emisi_limbah" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "emission_factor" DECIMAL(12,5) NOT NULL,
    "emission_factor_name" TEXT NOT NULL,
    "source" TEXT,
    "unit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faktor_emisi_limbah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "payload" TEXT NOT NULL,
    "last_activity" INTEGER NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "airports_country_idx" ON "airports"("country");

-- CreateIndex
CREATE INDEX "airports_is_active_idx" ON "airports"("is_active");

-- CreateIndex
CREATE INDEX "airports_iata_idx" ON "airports"("iata");

-- CreateIndex
CREATE INDEX "airports_icao_idx" ON "airports"("icao");

-- CreateIndex
CREATE UNIQUE INDEX "seaports_source_id_key" ON "seaports"("source_id");

-- CreateIndex
CREATE INDEX "seaports_country_code_idx" ON "seaports"("country_code");

-- CreateIndex
CREATE INDEX "seaports_is_active_idx" ON "seaports"("is_active");

-- CreateIndex
CREATE INDEX "seaports_name_idx" ON "seaports"("name");

-- CreateIndex
CREATE INDEX "hotels_country_code_idx" ON "hotels"("country_code");

-- CreateIndex
CREATE INDEX "hotels_name_idx" ON "hotels"("name");

-- CreateIndex
CREATE INDEX "jenis_kendaraan_type_idx" ON "jenis_kendaraan"("type");

-- CreateIndex
CREATE INDEX "jenis_kendaraan_name_idx" ON "jenis_kendaraan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_kendaraan_name_type_key" ON "jenis_kendaraan"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "faktor_emisi_makanan_name_key" ON "faktor_emisi_makanan"("name");

-- CreateIndex
CREATE INDEX "faktor_emisi_makanan_name_idx" ON "faktor_emisi_makanan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "faktor_emisi_limbah_name_key" ON "faktor_emisi_limbah"("name");

-- CreateIndex
CREATE INDEX "faktor_emisi_limbah_name_idx" ON "faktor_emisi_limbah"("name");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_last_activity_idx" ON "sessions"("last_activity");

-- AddForeignKey
ALTER TABLE "TenantPaymentConfig" ADD CONSTRAINT "TenantPaymentConfig_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
