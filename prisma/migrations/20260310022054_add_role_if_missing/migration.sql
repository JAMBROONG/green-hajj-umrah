-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'jemaah';

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");
