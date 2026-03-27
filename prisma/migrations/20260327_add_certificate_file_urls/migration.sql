-- AlterTable csr_activity_participations
ALTER TABLE "csr_activity_participations" ADD COLUMN "certificate_file_url" TEXT;

-- AlterTable carbon_certificate_purchases
ALTER TABLE "carbon_certificate_purchases" ADD COLUMN "certificate_file_url" TEXT;
