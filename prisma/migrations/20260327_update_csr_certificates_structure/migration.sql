-- AlterTable csr_activity_participations
-- Replace certificate_file_url with two separate certificate URLs
ALTER TABLE "csr_activity_participations" DROP COLUMN "certificate_file_url";
ALTER TABLE "csr_activity_participations" ADD COLUMN "thank_you_certificate_url" TEXT;
ALTER TABLE "csr_activity_participations" ADD COLUMN "participation_certificate_url" TEXT;
