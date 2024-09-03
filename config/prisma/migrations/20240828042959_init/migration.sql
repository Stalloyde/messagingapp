/*
  Warnings:

  - You are about to drop the `_userContacts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_userContacts" DROP CONSTRAINT "_userContacts_A_fkey";

-- DropForeignKey
ALTER TABLE "_userContacts" DROP CONSTRAINT "_userContacts_B_fkey";

-- DropTable
DROP TABLE "_userContacts";

-- CreateTable
CREATE TABLE "ContactRequests" (
    "id" SERIAL NOT NULL,
    "userIdFrom" INTEGER NOT NULL,
    "userIdTo" INTEGER NOT NULL,

    CONSTRAINT "ContactRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contacts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContactRequests" ADD CONSTRAINT "ContactRequests_userIdFrom_fkey" FOREIGN KEY ("userIdFrom") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequests" ADD CONSTRAINT "ContactRequests_userIdTo_fkey" FOREIGN KEY ("userIdTo") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacts" ADD CONSTRAINT "Contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
