-- CreateTable
CREATE TABLE "csr_activity_updates" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "csr_activity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csr_activity_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "csr_activity_updates_csr_activity_id_idx" ON "csr_activity_updates"("csr_activity_id");

-- AddForeignKey
ALTER TABLE "csr_activity_updates" ADD CONSTRAINT "csr_activity_updates_csr_activity_id_fkey"
    FOREIGN KEY ("csr_activity_id") REFERENCES "csr_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_csr_activity_updates_updated_at') THEN
        CREATE TRIGGER update_csr_activity_updates_updated_at
            BEFORE UPDATE ON "csr_activity_updates"
            FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END$$;
