-- CreateEnum
CREATE TYPE "EmailPriority" AS ENUM ('URGENT', 'IMPORTANT', 'NORMAL', 'LOW', 'SPAM');

-- CreateEnum
CREATE TYPE "EmailIntent" AS ENUM ('ACTION_REQUIRED', 'QUESTION', 'MEETING_REQUEST', 'FOLLOW_UP', 'FYI', 'NEWSLETTER', 'SPAM');

-- CreateEnum
CREATE TYPE "WatchlistType" AS ENUM ('EMAIL_ADDRESS', 'EMAIL_DOMAIN', 'KEYWORD', 'SLACK_USER', 'SLACK_KEYWORD');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- CreateTable
CREATE TABLE "EmailClassification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "snippet" TEXT,
    "priority" "EmailPriority" NOT NULL DEFAULT 'NORMAL',
    "intent" "EmailIntent" NOT NULL DEFAULT 'FYI',
    "score" INTEGER NOT NULL DEFAULT 50,
    "requiresReply" BOOLEAN NOT NULL DEFAULT false,
    "hasDeadline" BOOLEAN NOT NULL DEFAULT false,
    "deadlineText" TEXT,
    "sentiment" TEXT,
    "summary" TEXT,
    "suggestedReply" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isActedOn" BOOLEAN NOT NULL DEFAULT false,
    "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" "WatchlistType" NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "notifyOnEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSlack" BOOLEAN NOT NULL DEFAULT true,
    "alertLevel" "AlertLevel" NOT NULL DEFAULT 'NORMAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastMatchAt" TIMESTAMP(3),
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistMatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "watchlistItemId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "matchedValue" TEXT NOT NULL,
    "context" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailClassification_tenantId_priority_idx" ON "EmailClassification"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "EmailClassification_tenantId_workspaceId_idx" ON "EmailClassification"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "EmailClassification_tenantId_requiresReply_idx" ON "EmailClassification"("tenantId", "requiresReply");

-- CreateIndex
CREATE INDEX "EmailClassification_classifiedAt_idx" ON "EmailClassification"("classifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailClassification_tenantId_workspaceId_messageId_key" ON "EmailClassification"("tenantId", "workspaceId", "messageId");

-- CreateIndex
CREATE INDEX "WatchlistItem_tenantId_type_idx" ON "WatchlistItem"("tenantId", "type");

-- CreateIndex
CREATE INDEX "WatchlistItem_tenantId_isActive_idx" ON "WatchlistItem"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "WatchlistMatch_tenantId_isRead_idx" ON "WatchlistMatch"("tenantId", "isRead");

-- CreateIndex
CREATE INDEX "WatchlistMatch_watchlistItemId_idx" ON "WatchlistMatch"("watchlistItemId");

-- AddForeignKey
ALTER TABLE "EmailClassification" ADD CONSTRAINT "EmailClassification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistMatch" ADD CONSTRAINT "WatchlistMatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistMatch" ADD CONSTRAINT "WatchlistMatch_watchlistItemId_fkey" FOREIGN KEY ("watchlistItemId") REFERENCES "WatchlistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
