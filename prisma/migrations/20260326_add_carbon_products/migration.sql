-- CreateTable carbon_products
CREATE TABLE "carbon_products" (
    "id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "project" TEXT NOT NULL,
    "category" TEXT,
    "image_url" TEXT,
    "color_class" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carbon_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carbon_products_product_code_key" ON "carbon_products"("product_code");

-- CreateIndex
CREATE INDEX "carbon_products_is_active_idx" ON "carbon_products"("is_active");
