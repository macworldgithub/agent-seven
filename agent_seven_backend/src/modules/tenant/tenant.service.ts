import { prisma } from '../../config/db';

export class TenantService {
  /**
   * Get high-level overview metrics for an organization tenant
   */
  async getAdminOverview(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const [userCount, workspaceCount, agentCount, totalToolCalls, currentUsage] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.workspace.count({ where: { tenantId } }),
      prisma.agent.count({ where: { tenantId } }),
      prisma.toolCall.count({ where: { tenantId } }),
      prisma.usageRecord.findFirst({
        where: { tenantId },
        orderBy: { periodEnd: 'desc' },
      }),
    ]);

    const activeWorkspacesCount = await prisma.workspace.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    return {
      tenant,
      metrics: {
        totalUsers: userCount,
        totalWorkspaces: workspaceCount,
        activeWorkspaces: activeWorkspacesCount,
        totalAgents: agentCount,
        totalToolCalls,
        currentPeriod: currentUsage ? {
          periodStart: currentUsage.periodStart,
          periodEnd: currentUsage.periodEnd,
          toolCallCount: currentUsage.toolCallCount,
          llmTokensUsed: currentUsage.llmTokensUsed,
          voiceMinutesUsed: currentUsage.voiceMinutesUsed,
        } : null,
      },
    };
  }

  /**
   * List all users belonging to the tenant
   */
  async getAdminUsers(tenantId: string) {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isOrgAdmin: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /**
   * Update a user's admin status or active status
   */
  async updateUserStatus(tenantId: string, userId: string, data: { isOrgAdmin?: boolean; isActive?: boolean }) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error('User not found in this tenant');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(typeof data.isOrgAdmin === 'boolean' && { isOrgAdmin: data.isOrgAdmin }),
        ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isOrgAdmin: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Create Audit Log entry
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'USER_STATUS_UPDATED',
        resourceType: 'User',
        resourceId: userId,
        metaJson: JSON.stringify(data),
      },
    });

    return updatedUser;
  }

  /**
   * List all connected workspaces across the tenant with health status
   */
  async getAdminWorkspaces(tenantId: string) {
    const workspaces = await prisma.workspace.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        provider: true,
        status: true,
        providerEmail: true,
        isDefault: true,
        lastSuccessfulCallAt: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate tool call success rates per workspace
    const workspaceHealth = await Promise.all(
      workspaces.map(async (ws) => {
        const totalCalls = await prisma.toolCall.count({
          where: { tenantId, workspaceId: ws.id },
        });
        const failedCalls = await prisma.toolCall.count({
          where: { tenantId, workspaceId: ws.id, success: false },
        });

        return {
          ...ws,
          stats: {
            totalCalls,
            failedCalls,
            successRate: totalCalls > 0 ? ((totalCalls - failedCalls) / totalCalls) * 100 : 100,
          },
        };
      })
    );

    return workspaceHealth;
  }

  /**
   * Retrieve paginated audit logs for security and compliance
   */
  async getAdminAuditLogs(tenantId: string, page = 1, limit = 50, action?: string) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve historical usage records and tool call analytics
   */
  async getAdminUsage(tenantId: string) {
    const usageRecords = await prisma.usageRecord.findMany({
      where: { tenantId },
      orderBy: { periodStart: 'desc' },
      take: 12,
    });

    const toolCallBreakdown = await prisma.toolCall.groupBy({
      by: ['toolName'],
      where: { tenantId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return {
      usageHistory: usageRecords,
      topTools: toolCallBreakdown.map((item) => ({
        toolName: item.toolName,
        count: item._count.id,
      })),
    };
  }
}

export const tenantService = new TenantService();
