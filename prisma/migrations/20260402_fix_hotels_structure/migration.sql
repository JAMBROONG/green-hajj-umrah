-- Drop factor_emission columns since we'll use hotel_emission table now (if they exist)
ALTER TABLE "hotels" DROP COLUMN IF EXISTS "factor_emission";
ALTER TABLE "hotels" DROP COLUMN IF EXISTS "factor_emission_name";

-- Drop existing tenant_id column if it exists (might have wrong type from previous migration)
ALTER TABLE "hotels" DROP COLUMN IF EXISTS "tenant_id";

-- The country column should already exist from previous migration, but if not, add it
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "country" VARCHAR(50);

-- Add new columns with correct types
ALTER TABLE "hotels" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "hotel_emission_id" INTEGER;

-- Create hotel_emission table if it doesn't exist
CREATE TABLE IF NOT EXISTS "hotel_emission" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "country" VARCHAR(50) NOT NULL,
  "emission_factor" DECIMAL(10,4) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes (use IF NOT EXISTS to avoid errors if they already exist)
CREATE INDEX IF NOT EXISTS "hotels_tenant_id_idx" ON "hotels"("tenant_id");
CREATE INDEX IF NOT EXISTS "hotels_hotel_emission_id_idx" ON "hotels"("hotel_emission_id");
CREATE INDEX IF NOT EXISTS "hotel_emission_country_idx" ON "hotel_emission"("country");

-- Drop old constraints if they exist to re-add them correctly
ALTER TABLE "hotels" DROP CONSTRAINT IF EXISTS "hotels_hotel_emission_id_fkey";

-- Add the hotel_emission foreign key
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_hotel_emission_id_fkey" FOREIGN KEY ("hotel_emission_id") REFERENCES "hotel_emission"("id") ON DELETE SET NULL;

-- Add foreign key for tenant_id
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
