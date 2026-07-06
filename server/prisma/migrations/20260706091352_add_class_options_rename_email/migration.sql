/*
  Warnings:

  - You are about to drop the column `emailParent` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "emailParent",
ADD COLUMN     "email" TEXT;
