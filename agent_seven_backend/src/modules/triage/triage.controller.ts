import { Request, Response } from 'express'
import { 
  getClassifiedEmails, 
  getTriageSummary, 
  markEmailActedOn, 
  generateEmailReply 
} from '../../services/emailClassification.service'
import {
  getWatchlistItems,
  createWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
  toggleWatchlistItem,
  getWatchlistMatches,
  markMatchRead,
  markAllMatchesRead,
  getUnreadMatchCount
} from '../../services/watchlist.service'
import { triggerEmailTriage } from '../../services/tools/triage.tools'
import { briefingQueue } from '../../config/queues'
import { prisma } from '../../config/db'

export const getEmails = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { priority, intent, requiresReply, isActedOn, workspaceId, limit, offset } = req.query

  const filters = {
    workspaceId: workspaceId as string,
    priority: priority as any,
    intent: intent as any,
    requiresReply: requiresReply === 'true' ? true : (requiresReply === 'false' ? false : undefined),
    isActedOn: isActedOn === 'true' ? true : (isActedOn === 'false' ? false : undefined),
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0
  }

  const result = await getClassifiedEmails(tenantId, filters)
  res.json({ success: true, data: result })
}

export const getSummary = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { workspaceId } = req.query
  const summary = await getTriageSummary(tenantId, workspaceId as string | undefined)
  res.json({ success: true, data: summary })
}

export const triggerTriage = async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!
    
    // Get agent
    const agent = await prisma.agent.findFirst({ where: { tenantId } })
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' })

    // Verify there are active Google workspaces
    const workspaces = await prisma.workspace.findMany({
      where: {
        tenantId,
        provider: 'GOOGLE',
        status: 'ACTIVE'
      }
    })

    if (workspaces.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No active Google workspaces found. Please connect a Google Workspace first.' 
      })
    }

    // Add job to briefing queue (not scheduler queue)
    await briefingQueue.add('email_triage', {
      type: 'email_triage',
      tenantId,
      agentId: agent.id
    })

    res.json({ 
      success: true, 
      data: { 
        message: `Email triage started for ${workspaces.length} workspace(s). Results available in ~1 minute.`,
        workspacesCount: workspaces.length
      }
    })
  } catch (err: any) {
    console.error('[triggerTriage] Error:', err?.message || err)
    res.status(500).json({ success: false, error: err?.message || 'Failed to trigger triage' })
  }
}

export const markActed = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const id = req.params.id as string
  await markEmailActedOn(tenantId, id)
  res.json({ success: true })
}

export const draftReply = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const id = req.params.id as string
  
  // We should pass a valid token, but for now our generateEmailReply might use a mock or fetch it itself
  // Here we just pass an empty string as placeholder
  const reply = await generateEmailReply(tenantId, id, '')
  res.json({ success: true, data: { reply } })
}

// Watchlist endpoints
export const getWatchlist = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const agent = await prisma.agent.findFirst({ where: { tenantId } })
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' })

  const items = await getWatchlistItems(tenantId, agent.id)
  res.json({ success: true, data: items })
}

export const addWatchlist = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const agent = await prisma.agent.findFirst({ where: { tenantId } })
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' })

  const item = await createWatchlistItem(tenantId, agent.id, req.body)
  res.json({ success: true, data: item })
}

export const updateWatchlist = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const id = req.params.id as string
  const item = await updateWatchlistItem(id, tenantId, req.body)
  res.json({ success: true, data: item })
}

export const deleteWatchlist = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const id = req.params.id as string
  await deleteWatchlistItem(id, tenantId)
  res.json({ success: true })
}

export const toggleWatchlist = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const id = req.params.id as string
  const item = await toggleWatchlistItem(id, tenantId)
  res.json({ success: true, data: item })
}

// Alerts
export const getAlerts = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { unreadOnly } = req.query
  const filters = {
    isRead: unreadOnly === 'true' ? false : undefined
  }
  const alerts = await getWatchlistMatches(tenantId, filters)
  res.json({ success: true, data: alerts })
}

export const readAlert = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const id = req.params.id as string
  await markMatchRead(id, tenantId)
  res.json({ success: true })
}

export const readAllAlerts = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  await markAllMatchesRead(tenantId)
  res.json({ success: true })
}

export const getAlertsCount = async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const count = await getUnreadMatchCount(tenantId)
  res.json({ success: true, data: { count } })
}
