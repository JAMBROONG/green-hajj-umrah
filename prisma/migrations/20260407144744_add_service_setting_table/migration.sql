-- CreateTable
CREATE TABLE "service_setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idx_admin_fee" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);
