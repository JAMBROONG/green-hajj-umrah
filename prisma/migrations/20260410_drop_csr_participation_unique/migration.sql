-- Drop unique constraint to allow multiple donations per user per activity
DROP INDEX IF EXISTS "csr_activity_participations_user_id_csr_activity_id_key";
