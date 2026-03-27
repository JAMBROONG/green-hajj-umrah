-- AlterTable carbon_certificate_purchases
ALTER TABLE "carbon_certificate_purchases" ADD COLUMN "product_id" TEXT,
ADD COLUMN "units" INTEGER,
ADD COLUMN "total_price" DECIMAL(12,2),
ADD COLUMN "transaction_reference" TEXT,
ADD COLUMN "metadata" JSONB;

-- AddForeignKey
ALTER TABLE "carbon_certificate_purchases" ADD CONSTRAINT "carbon_certificate_purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "carbon_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
