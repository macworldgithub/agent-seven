/*
  Warnings:

  - You are about to drop the column `watchlistEnabled` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the `WatchlistItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WatchlistMatch` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WatchlistItem" DROP CONSTRAINT "WatchlistItem_agentId_fkey";

-- DropForeignKey
ALTER TABLE "WatchlistItem" DROP CONSTRAINT "WatchlistItem_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WatchlistMatch" DROP CONSTRAINT "WatchlistMatch_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WatchlistMatch" DROP CONSTRAINT "WatchlistMatch_watchlistItemId_fkey";

-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "watchlistEnabled";

-- DropTable
DROP TABLE "WatchlistItem";

-- DropTable
DROP TABLE "WatchlistMatch";

-- DropEnum
DROP TYPE "AlertLevel";

-- DropEnum
DROP TYPE "WatchlistType";
