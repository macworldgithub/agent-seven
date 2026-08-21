import { Request, Response } from 'express'
import { 
  getClassifiedEmails, 
  getTriageSummary, 
  markEmailActedOn, 
  generateEmailReply 
} from '../../services/emailClassification.service'
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
