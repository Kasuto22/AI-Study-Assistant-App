/*
  Warnings:

  - You are about to drop the column `description` on the `Deck` table. All the data in the column will be lost.
  - You are about to drop the column `answer` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `question` on the `Flashcard` table. All the data in the column will be lost.
  - Added the required column `back` to the `Flashcard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `front` to the `Flashcard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Deck" DROP COLUMN "description";

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "answer",
DROP COLUMN "createdAt",
DROP COLUMN "question",
ADD COLUMN     "back" TEXT NOT NULL,
ADD COLUMN     "front" TEXT NOT NULL;
