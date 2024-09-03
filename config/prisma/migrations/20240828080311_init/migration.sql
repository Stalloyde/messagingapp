/*
  Warnings:

  - You are about to drop the `ContactRequests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ContactRequests" DROP CONSTRAINT "ContactRequests_userIdFrom_fkey";

-- DropForeignKey
ALTER TABLE "ContactRequests" DROP CONSTRAINT "ContactRequests_userIdTo_fkey";

-- DropTable
DROP TABLE "ContactRequests";

-- CreateTable
CREATE TABLE "ContactsRequests" (
    "id" SERIAL NOT NULL,
    "userIdFrom" INTEGER NOT NULL,
    "userIdTo" INTEGER NOT NULL,

    CONSTRAINT "ContactsRequests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContactsRequests" ADD CONSTRAINT "ContactsRequests_userIdFrom_fkey" FOREIGN KEY ("userIdFrom") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactsRequests" ADD CONSTRAINT "ContactsRequests_userIdTo_fkey" FOREIGN KEY ("userIdTo") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
