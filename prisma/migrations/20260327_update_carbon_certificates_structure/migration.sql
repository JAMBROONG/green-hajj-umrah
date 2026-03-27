-- AlterTable carbon_certificate_purchases
-- Replace single certificate_file_url with two separate certificate URLs
ALTER TABLE "carbon_certificate_purchases" DROP COLUMN "certificate_file_url";
ALTER TABLE "carbon_certificate_purchases" ADD COLUMN "thank_you_certificate_url" TEXT;
ALTER TABLE "carbon_certificate_purchases" ADD COLUMN "emission_reduction_certificate_url" TEXT;
