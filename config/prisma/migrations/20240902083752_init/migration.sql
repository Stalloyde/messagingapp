/*
  Warnings:

  - You are about to drop the column `groupId` on the `GroupMessages` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `GroupMessages` table. All the data in the column will be lost.
  - Added the required column `groupIdTo` to the `GroupMessages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userIdFrom` to the `GroupMessages` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GroupMessages" DROP CONSTRAINT "GroupMessages_groupId_fkey";

-- DropForeignKey
ALTER TABLE "GroupMessages" DROP CONSTRAINT "GroupMessages_userId_fkey";

-- AlterTable
ALTER TABLE "GroupMessages" DROP COLUMN "groupId",
DROP COLUMN "userId",
ADD COLUMN     "groupIdTo" INTEGER NOT NULL,
ADD COLUMN     "userIdFrom" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "GroupMessages" ADD CONSTRAINT "GroupMessages_userIdFrom_fkey" FOREIGN KEY ("userIdFrom") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessages" ADD CONSTRAINT "GroupMessages_groupIdTo_fkey" FOREIGN KEY ("groupIdTo") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
