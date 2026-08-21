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

