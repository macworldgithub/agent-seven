import { prisma } from '../config/db'
import { WatchlistType, AlertLevel, WatchlistItem, WatchlistMatch } from '@prisma/client'

// Create watchlist item
export const createWatchlistItem = async (
  tenantId: string,
  agentId: string,
  data: {
    type: WatchlistType
    value: string
    label?: string
    description?: string
    notifyOnEmail?: boolean
    notifyOnSlack?: boolean
    alertLevel?: AlertLevel
  }
): Promise<WatchlistItem> => {
  // Validate value based on type
  let formattedValue = data.value.toLowerCase().trim()
  
  if (data.type === 'EMAIL_DOMAIN' && formattedValue.startsWith('@')) {
    formattedValue = formattedValue.substring(1)
  }

  // Check for duplicates
  const existing = await prisma.watchlistItem.findFirst({
    where: {
      tenantId,
      type: data.type,
      value: formattedValue
    }
  })

  if (existing) {
    throw new Error('Watchlist item already exists')
  }

  return await prisma.watchlistItem.create({
    data: {
      tenantId,
      agentId,
      type: data.type,
      value: formattedValue,
      label: data.label,
      description: data.description,
      notifyOnEmail: data.notifyOnEmail ?? true,
      notifyOnSlack: data.notifyOnSlack ?? true,
      alertLevel: data.alertLevel || 'NORMAL'
    }
  })
}

// Get all watchlist items for tenant
export const getWatchlistItems = async (
  tenantId: string,
  agentId: string,
  type?: WatchlistType
): Promise<WatchlistItem[]> => {
  return await prisma.watchlistItem.findMany({
    where: {
      tenantId,
      agentId,
      ...(type ? { type } : {})
    },
    orderBy: { createdAt: 'desc' }
  })
}

// Update watchlist item
export const updateWatchlistItem = async (
  id: string,
  tenantId: string,
  data: Partial<WatchlistItem>
): Promise<WatchlistItem> => {
  return await prisma.watchlistItem.update({
    where: { id, tenantId },
    data
  })
}

// Delete watchlist item
export const deleteWatchlistItem = async (
  id: string,
  tenantId: string
): Promise<void> => {
  await prisma.watchlistItem.delete({
    where: { id, tenantId }
  })
}

// Toggle watchlist item active state
export const toggleWatchlistItem = async (
  id: string,
  tenantId: string
): Promise<WatchlistItem> => {
  const item = await prisma.watchlistItem.findUnique({
    where: { id, tenantId }
  })
  
  if (!item) throw new Error('Not found')
  
  return await prisma.watchlistItem.update({
    where: { id },
    data: { isActive: !item.isActive }
  })
}

// Check emails against watchlist
export const checkEmailsAgainstWatchlist = async (
  tenantId: string,
  emails: {
    messageId: string
    threadId: string
    from: string
    subject: string
    snippet: string
  }[]
): Promise<WatchlistMatch[]> => {
  const activeItems = await prisma.watchlistItem.findMany({
    where: { tenantId, isActive: true, notifyOnEmail: true }
  })
  
  if (activeItems.length === 0 || emails.length === 0) return []

  const matches: any[] = []

  for (const email of emails) {
    const fromLower = email.from.toLowerCase()
    const contentLower = (email.subject + ' ' + email.snippet).toLowerCase()

    for (const item of activeItems) {
      let isMatch = false
      let matchContext = ''

      if (item.type === 'EMAIL_ADDRESS' && fromLower.includes(item.value)) {
        isMatch = true
        matchContext = `From: ${email.from}`
      } else if (item.type === 'EMAIL_DOMAIN' && fromLower.includes('@' + item.value)) {
        isMatch = true
        matchContext = `From domain: ${item.value}`
      } else if (item.type === 'KEYWORD' && contentLower.includes(item.value)) {
        isMatch = true
        matchContext = `Found keyword in subject/preview`
      }

      if (isMatch) {
        matches.push({
          tenantId,
          watchlistItemId: item.id,
          source: 'email',
          sourceId: email.messageId,
          matchedValue: item.value,
          context: matchContext
        })
      }
    }
  }

  if (matches.length > 0) {
    // Save matches
    const createdMatches = await prisma.$transaction(
      matches.map(m => prisma.watchlistMatch.create({ data: m }))
    )
    
    // Update match counts
    const itemIds = [...new Set(matches.map(m => m.watchlistItemId))]
    for (const id of itemIds) {
      await prisma.watchlistItem.update({
        where: { id },
        data: {
          matchCount: { increment: matches.filter(m => m.watchlistItemId === id).length },
          lastMatchAt: new Date()
        }
      })
    }
    
    return createdMatches
  }

  return []
}

// Check Slack messages against watchlist
export const checkSlackAgainstWatchlist = async (
  tenantId: string,
  messages: {
    messageId: string
    userName: string
    text: string
    channelId: string
  }[]
): Promise<WatchlistMatch[]> => {
  const activeItems = await prisma.watchlistItem.findMany({
    where: { tenantId, isActive: true, notifyOnSlack: true }
  })
  
  if (activeItems.length === 0 || messages.length === 0) return []

  const matches: any[] = []

  for (const msg of messages) {
    const userNameLower = msg.userName.toLowerCase()
    const textLower = msg.text.toLowerCase()

    for (const item of activeItems) {
      let isMatch = false
      let matchContext = ''

      if (item.type === 'SLACK_USER' && userNameLower.includes(item.value)) {
        isMatch = true
        matchContext = `Message from ${msg.userName}`
      } else if ((item.type === 'SLACK_KEYWORD' || item.type === 'KEYWORD') && textLower.includes(item.value)) {
        isMatch = true
        matchContext = msg.text.substring(0, 100) // snippet
      }

      if (isMatch) {
        matches.push({
          tenantId,
          watchlistItemId: item.id,
          source: 'slack',
          sourceId: msg.messageId,
          matchedValue: item.value,
          context: matchContext
        })
      }
    }
  }

  if (matches.length > 0) {
    const createdMatches = await prisma.$transaction(
      matches.map(m => prisma.watchlistMatch.create({ data: m }))
    )
    
    const itemIds = [...new Set(matches.map(m => m.watchlistItemId))]
    for (const id of itemIds) {
      await prisma.watchlistItem.update({
        where: { id },
        data: {
          matchCount: { increment: matches.filter(m => m.watchlistItemId === id).length },
          lastMatchAt: new Date()
        }
      })
    }
    
    return createdMatches
  }

  return []
}

// Get watchlist matches (alerts)
export const getWatchlistMatches = async (
  tenantId: string,
  filters?: {
    isRead?: boolean
    source?: string
    limit?: number
  }
): Promise<WatchlistMatch[]> => {
  const where: any = { tenantId }
  if (filters?.isRead !== undefined) where.isRead = filters.isRead
  if (filters?.source) where.source = filters.source

  return await prisma.watchlistMatch.findMany({
    where,
    include: { watchlistItem: true },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50
  })
}

// Mark match as read
export const markMatchRead = async (
  id: string,
  tenantId: string
): Promise<void> => {
  await prisma.watchlistMatch.update({
    where: { id, tenantId },
    data: { isRead: true }
  })
}

// Mark all matches as read
export const markAllMatchesRead = async (
  tenantId: string
): Promise<void> => {
  await prisma.watchlistMatch.updateMany({
    where: { tenantId, isRead: false },
    data: { isRead: true }
  })
}

// Get unread match count
export const getUnreadMatchCount = async (
  tenantId: string
): Promise<number> => {
  return await prisma.watchlistMatch.count({
    where: { tenantId, isRead: false }
  })
}
