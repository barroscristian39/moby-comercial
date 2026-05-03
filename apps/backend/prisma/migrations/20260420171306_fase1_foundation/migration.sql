-- CreateEnum
CREATE TYPE "EpiDeliveryReason" AS ENUM ('ADMISSION', 'PERIODIC', 'REPLACEMENT', 'FUNCTION_CHANGE', 'CA_RENEWAL', 'OTHER');

-- CreateEnum
CREATE TYPE "EpiCondition" AS ENUM ('NEW', 'USED');

-- CreateTable
CREATE TABLE "epi_items" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ca_number" TEXT NOT NULL,
    "ca_expiry" DATE,
    "manufacturer" TEXT,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'unidade',
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "min_stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "epi_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "epi_deliveries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "epi_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "delivered_at" DATE NOT NULL,
    "reason" "EpiDeliveryReason" NOT NULL,
    "condition" "EpiCondition" NOT NULL DEFAULT 'NEW',
    "delivered_by" TEXT,
    "returned_at" DATE,
    "notes" TEXT,
    "ca_number_snapshot" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "epi_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "epi_items_company_id_idx" ON "epi_items"("company_id");

-- CreateIndex
CREATE INDEX "epi_deliveries_company_id_idx" ON "epi_deliveries"("company_id");

-- CreateIndex
CREATE INDEX "epi_deliveries_employee_id_idx" ON "epi_deliveries"("employee_id");

-- CreateIndex
CREATE INDEX "epi_deliveries_epi_item_id_idx" ON "epi_deliveries"("epi_item_id");

-- AddForeignKey
ALTER TABLE "epi_items" ADD CONSTRAINT "epi_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "epi_deliveries" ADD CONSTRAINT "epi_deliveries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "epi_deliveries" ADD CONSTRAINT "epi_deliveries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "epi_deliveries" ADD CONSTRAINT "epi_deliveries_epi_item_id_fkey" FOREIGN KEY ("epi_item_id") REFERENCES "epi_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
