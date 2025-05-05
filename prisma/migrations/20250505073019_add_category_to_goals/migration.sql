/*
  Warnings:

  - You are about to drop the column `aiAnalysis` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `goalId` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `type` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Made the column `aiSuggestions` on table `Goal` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_goalId_fkey";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "categoryId" TEXT NOT NULL,
ALTER COLUMN "currentAmount" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS',
ALTER COLUMN "aiSuggestions" SET NOT NULL,
ALTER COLUMN "aiSuggestions" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "aiAnalysis",
DROP COLUMN "goalId",
ALTER COLUMN "date" DROP DEFAULT,
ALTER COLUMN "tags" SET DEFAULT '[]';

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
