import { PrismaClient } from '@prisma/client'

// Get urgent emails
export const getUrgentEmails = async (
  prisma: PrismaClient,
  input: { tenantId: string, workspaceId?: string, limit?: number }
): Promise<any> => {
  const where: any = { 
    tenantId: input.tenantId,
    priority: { in: ['URGENT', 'IMPORTANT'] },
    isActedOn: false
  }
  if (input.workspaceId) where.workspaceId = input.workspaceId
  
  const emails = await prisma.emailClassification.findMany({
    where,
    orderBy: [
      { score: 'desc' },
      { classifiedAt: 'desc' }
    ],
    take: input.limit || 10
  })
  return emails
}

// Get emails requiring reply
export const getEmailsRequiringReply = async (
  prisma: PrismaClient,
  input: { tenantId: string, workspaceId?: string }
): Promise<any> => {
  const where: any = { 
    tenantId: input.tenantId,
    requiresReply: true,
    isActedOn: false
  }
  if (input.workspaceId) where.workspaceId = input.workspaceId
  
  const emails = await prisma.emailClassification.findMany({
    where,
    orderBy: { classifiedAt: 'desc' },
    take: 10
  })
  return emails
}

// Get triage summary
export const getEmailTriageSummary = async (
  prisma: PrismaClient,
  input: { tenantId: string, workspaceId?: string }
): Promise<any> => {
  const where: any = { tenantId: input.tenantId }
  if (input.workspaceId) where.workspaceId = input.workspaceId

  const stats = await prisma.emailClassification.groupBy({
    by: ['priority'],
    where,
    _count: true
  })

  const requiresReply = await prisma.emailClassification.count({
    where: { ...where, requiresReply: true, isActedOn: false }
  })

  return {
    breakdown: stats,
    needsReply: requiresReply
  }
}

// Trigger triage now
export const triggerEmailTriage = async (
  prisma: PrismaClient,
  input: { tenantId: string, agentId: string }
): Promise<any> => {
  // To avoid circular dependency with scheduler queue in this file, we return a success message
  // and the controller or caller can handle the actual queue addition if needed.
  // Actually, we can import briefingQueue if we want:
  const { schedulerQueue } = await import('../../config/queues')
  
  await schedulerQueue.add('run_email_triage', { 
    type: 'run_email_triage'
  })
  
  return { status: "Triage started, results in ~2 minutes" }
}

// Get watchlist alerts
export const getWatchlistAlerts = async (
  prisma: PrismaClient,
  input: { tenantId: string, unreadOnly?: boolean }
): Promise<any> => {
  const where: any = { tenantId: input.tenantId }
  if (input.unreadOnly !== false) {
    where.isRead = false
  }
  
  const alerts = await prisma.watchlistMatch.findMany({
    where,
    include: { watchlistItem: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  return alerts
}

// Add to watchlist
export const addToWatchlist = async (
  prisma: PrismaClient,
  input: {
    tenantId: string
    agentId: string
    type: string
    value: string
    label?: string
    alertLevel?: string
  }
): Promise<any> => {
  // Let the service handle it, or do it directly here for the tool
  const formattedValue = input.value.toLowerCase().trim()
  const actualValue = (input.type === 'EMAIL_DOMAIN' && formattedValue.startsWith('@'))
    ? formattedValue.substring(1) 
    : formattedValue

  const item = await prisma.watchlistItem.create({
    data: {
      tenantId: input.tenantId,
      agentId: input.agentId,
      type: input.type as any,
      value: actualValue,
      label: input.label,
      alertLevel: (input.alertLevel || 'NORMAL') as any
    }
  })
  
  return item
}

// Get watchlist items
export const getWatchlistItems = async (
  prisma: PrismaClient,
  input: { tenantId: string, agentId: string }
): Promise<any> => {
  return await prisma.watchlistItem.findMany({
    where: { tenantId: input.tenantId, agentId: input.agentId },
    orderBy: { createdAt: 'desc' }
  })
}
