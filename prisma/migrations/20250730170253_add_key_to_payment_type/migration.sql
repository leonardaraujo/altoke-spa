/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `PaymentType` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PaymentType" ADD COLUMN     "key" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentType_key_key" ON "PaymentType"("key");
