-- Create hotel_emission table
CREATE TABLE "hotel_emission" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "country" VARCHAR(50) NOT NULL,
  "emission_factor" DECIMAL(10,4) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on country
CREATE INDEX "hotel_emission_country_idx" ON "hotel_emission"("country");

-- Rename country_code to country for consistency with hotel_emission
ALTER TABLE "hotels" RENAME COLUMN "country_code" TO "country";

-- Add columns to hotels table with proper types
ALTER TABLE "hotels" ADD COLUMN "tenant_id" UUID;
ALTER TABLE "hotels" ADD COLUMN "hotel_emission_id" INTEGER;

-- Create indexes for new columns
CREATE INDEX "hotels_tenant_id_idx" ON "hotels"("tenant_id");
CREATE INDEX "hotels_hotel_emission_id_idx" ON "hotels"("hotel_emission_id");

-- Add foreign keys AFTER column creation
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_hotel_emission_id_fkey" FOREIGN KEY ("hotel_emission_id") REFERENCES "hotel_emission"("id") ON DELETE SET NULL;
