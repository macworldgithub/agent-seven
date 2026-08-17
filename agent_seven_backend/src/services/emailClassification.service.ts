import { llmService } from './llm.service'
import { prisma } from '../config/db'
import { logger } from '../utils/logger'
import { EmailPriority, EmailIntent, EmailClassification } from '@prisma/client'

// Classification prompt for Haiku
const buildClassificationPrompt = (email: {
  subject: string
  from: string
  snippet: string
  body?: string
}): string => `
You are an email triage assistant for a busy business founder. 
Classify this email and respond ONLY with valid JSON, no other text.

Email:
From: ${email.from}
Subject: ${email.subject}
Preview: ${email.snippet}
${email.body ? `Body: ${email.body.substring(0, 500)}` : ''}

Respond with this exact JSON structure:
{
  "priority": "URGENT|IMPORTANT|NORMAL|LOW|SPAM",
  "intent": "ACTION_REQUIRED|QUESTION|MEETING_REQUEST|FOLLOW_UP|FYI|NEWSLETTER|SPAM",
  "score": <number 0-100>,
  "requiresReply": <boolean>,
  "hasDeadline": <boolean>,
  "deadlineText": "<deadline text or null>",
  "sentiment": "positive|negative|neutral",
  "summary": "<one sentence summary>",
  "reason": "<brief reason for classification>"
}

Classification rules:
- URGENT (score 80-100): Legal threats, payment failures, client emergencies, system outages, deadlines within 24hrs
- IMPORTANT (score 60-79): Client questions, meeting requests, partnership opportunities, invoices
- NORMAL (score 40-59): Team updates, vendor emails, general inquiries
- LOW (score 20-39): FYI emails, CC'd emails not requiring action
- SPAM (score 0-19): Marketing, newsletters, promotions, automated notifications
`

export type EmailClassificationResult = {
  priority: EmailPriority
  intent: EmailIntent
  score: number
  requiresReply: boolean
  hasDeadline: boolean
  deadlineText: string | null
  sentiment: string | null
  summary: string | null
  reason: string
}

export type EmailInput = {
  messageId: string
  threadId: string
  subject: string
  from: string
  snippet: string
  body?: string
  emailDate?: Date
}

// Classify a single email
export const classifyEmail = async (
  tenantId: string,
  workspaceId: string,
  email: EmailInput
): Promise<EmailClassificationResult> => {
  // Check if already classified
  const existing = await prisma.emailClassification.findUnique({
    where: {
      tenantId_workspaceId_messageId: {
        tenantId,
        workspaceId,
        messageId: email.messageId
      }
    }
  })

  if (existing) {
    return {
      priority: existing.priority,
      intent: existing.intent,
      score: existing.score,
      requiresReply: existing.requiresReply,
      hasDeadline: existing.hasDeadline,
      deadlineText: existing.deadlineText,
      sentiment: existing.sentiment,
      summary: existing.summary,
      reason: "Loaded from cache"
    }
  }

  const prompt = buildClassificationPrompt(email)
  let result: EmailClassificationResult
  
  try {
    const aiResponse = await llmService.classifyWithHaiku(prompt)
    result = JSON.parse(aiResponse)
  } catch (error) {
    logger.warn(`Failed to parse AI classification for email ${email.messageId}, falling back to NORMAL`)
    result = {
      priority: 'NORMAL',
      intent: 'FYI',
      score: 50,
      requiresReply: false,
      hasDeadline: false,
      deadlineText: null,
      sentiment: 'neutral',
      summary: 'Failed to classify email',
      reason: 'AI parsing failed'
    }
  }

  // Save to DB
  await prisma.emailClassification.upsert({
    where: {
      tenantId_workspaceId_messageId: {
        tenantId,
        workspaceId,
        messageId: email.messageId
      }
    },
    create: {
      tenantId,
      workspaceId,
      messageId: email.messageId,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      snippet: email.snippet,
      priority: result.priority,
      intent: result.intent,
      score: result.score,
      requiresReply: result.requiresReply,
      hasDeadline: result.hasDeadline,
      deadlineText: result.deadlineText,
      sentiment: result.sentiment,
      summary: result.summary,
      emailDate: email.emailDate,
    },
    update: {
      priority: result.priority,
      intent: result.intent,
      score: result.score,
      requiresReply: result.requiresReply,
      hasDeadline: result.hasDeadline,
      deadlineText: result.deadlineText,
      sentiment: result.sentiment,
      summary: result.summary,
    }
  })

  return result
}

// Classify multiple emails in batch
export const classifyEmailBatch = async (
  tenantId: string,
  workspaceId: string,
  emails: EmailInput[]
): Promise<EmailClassificationResult[]> => {
  const results: EmailClassificationResult[] = []
  
  // Process in chunks of 5
  for (let i = 0; i < emails.length; i += 5) {
    const chunk = emails.slice(i, i + 5)
    const chunkResults = await Promise.all(
      chunk.map(email => classifyEmail(tenantId, workspaceId, email))
    )
    results.push(...chunkResults)
  }
  
  return results
}

// Get classified emails for tenant
export const getClassifiedEmails = async (
  tenantId: string,
  filters?: {
    workspaceId?: string
    priority?: EmailPriority
    intent?: EmailIntent
    requiresReply?: boolean
    isActedOn?: boolean
    limit?: number
    offset?: number
  }
): Promise<{ emails: EmailClassification[], total: number }> => {
  const where: any = { tenantId }
  if (filters?.workspaceId) where.workspaceId = filters.workspaceId
  if (filters?.priority) where.priority = filters.priority
  if (filters?.intent) where.intent = filters.intent
  if (filters?.requiresReply !== undefined) where.requiresReply = filters.requiresReply
  if (filters?.isActedOn !== undefined) where.isActedOn = filters.isActedOn

  const [emails, total] = await Promise.all([
    prisma.emailClassification.findMany({
      where,
      orderBy: [
        { score: 'desc' },
        { classifiedAt: 'desc' }
      ],
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.emailClassification.count({ where })
  ])

  return { emails, total }
}

// Mark email as acted on
export const markEmailActedOn = async (
  tenantId: string,
  classificationId: string
): Promise<void> => {
  await prisma.emailClassification.updateMany({
    where: { id: classificationId, tenantId },
    data: { isActedOn: true }
  })
}

// Get triage summary
export const getTriageSummary = async (
  tenantId: string,
  workspaceId?: string
): Promise<{
  urgent: number
  important: number
  normal: number
  low: number
  spam: number
  requiresReply: number
  unacted: number
}> => {
  const where: any = { tenantId }
  if (workspaceId) where.workspaceId = workspaceId

  const stats = await prisma.emailClassification.groupBy({
    by: ['priority'],
    where,
    _count: true
  })

  const urgent = stats.find(s => s.priority === 'URGENT')?._count || 0
  const important = stats.find(s => s.priority === 'IMPORTANT')?._count || 0
  const normal = stats.find(s => s.priority === 'NORMAL')?._count || 0
  const low = stats.find(s => s.priority === 'LOW')?._count || 0
  const spam = stats.find(s => s.priority === 'SPAM')?._count || 0

  const requiresReply = await prisma.emailClassification.count({
    where: { ...where, requiresReply: true }
  })

  const unacted = await prisma.emailClassification.count({
    where: { ...where, isActedOn: false }
  })

  return { urgent, important, normal, low, spam, requiresReply, unacted }
}

// Auto-draft reply for an email
export const generateEmailReply = async (
  tenantId: string,
  classificationId: string,
  accessToken: string
): Promise<string> => {
  const classification = await prisma.emailClassification.findFirst({
    where: { id: classificationId, tenantId }
  })

  if (!classification) {
    throw new Error('Email classification not found')
  }

  // Simplified version: uses Haiku/Sonnet with the snippet
  // In a real implementation we would fetch the full thread from Gmail using the accessToken
  
  const prompt = `
  You are an AI assistant drafting a professional reply to this email.
  
  From: ${classification.from}
  Subject: ${classification.subject}
  Content: ${classification.snippet}
  
  Write a concise, professional, and helpful reply. Assume it's from a busy executive.
  Do not include [Your Name] placeholders, keep it natural.
  `

  const draft = await llmService.classifyWithHaiku(prompt) // Using haiku for speed, could use sonnet
  
  await prisma.emailClassification.update({
    where: { id: classificationId },
    data: { suggestedReply: draft.trim() }
  })

  return draft.trim()
}
