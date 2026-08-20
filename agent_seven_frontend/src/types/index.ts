export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  isOrgAdmin: boolean;
  isActive?: boolean;
  avatar?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverview {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    subscriptionStatus: string;
    createdAt: string;
  };
  metrics: {
    totalUsers: number;
    totalWorkspaces: number;
    activeWorkspaces: number;
    totalAgents: number;
    totalToolCalls: number;
    currentPeriod: {
      periodStart: string;
      periodEnd: string;
      toolCallCount: number;
      llmTokensUsed: number;
      voiceMinutesUsed: number;
    } | null;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  isOrgAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  provider: string;
  status: string;
  providerEmail: string | null;
  isDefault: boolean;
  lastSuccessfulCallAt: string | null;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  stats: {
    totalCalls: number;
    failedCalls: number;
    successRate: number;
  };
}

export interface AuditLogItem {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metaJson: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminUsage {
  usageHistory: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    toolCallCount: number;
    llmTokensUsed: number;
    voiceMinutesUsed: number;
  }>;
  topTools: Array<{
    toolName: string;
    count: number;
  }>;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  spokenName: string | null;
  personalityPreset: string;
  morningBriefingEnabled: boolean;
  morningBriefingTime: string | null;
  morningBriefingTimezone: string | null;
  driftDetectionEnabled: boolean;
  replyTrackingEnabled: boolean;
  watchlistEnabled: boolean;
  systemPromptAppendix: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceProvider = 'google' | 'slack';
export type WorkspaceStatus = 'active' | 'expiring_soon' | 'expired' | 'revoked';

export interface Workspace {
  id: string;
  tenantId: string;
  provider: WorkspaceProvider;
  providerWorkspaceId: string;
  providerUserId: string;
  name: string;
  email: string | null;
  isDefault: boolean;
  status: WorkspaceStatus;
  permissions: Permission[];
  lastConnectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type Permission =
  | 'READ_EMAIL'
  | 'DRAFT_EMAIL'
  | 'SEND_EMAIL'
  | 'SEND_EMAIL_WITH_APPROVAL'
  | 'CALENDAR_READ'
  | 'CALENDAR_WRITE'
  | 'DRIVE_READ'
  | 'DRIVE_WRITE'
  | 'SLACK_READ'
  | 'SLACK_SEND';

export interface Conversation {
  id: string;
  tenantId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  createdAt: string;
}

export type MemoryType = 'preference' | 'fact' | 'relationship';

export interface Memory {
  id: string;
  tenantId: string;
  type: MemoryType;
  content: string;
  confidence: number;
  source: string;
  createdAt: string;
}

export type ActionItemStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface ActionItem {
  id: string;
  tenantId: string;
  agentId?: string;
  memoryId?: string;
  title: string;
  description: string | null;
  status: ActionItemStatus;
  dueAt: string | null;
  completedAt?: string | null;
  sourceRef?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: Tenant;
  agent: Agent;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  limits: { toolCallsPerDay: number, workspaces: number };
}

export interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface Usage {
  toolCallCount: number;
  llmTokensUsed: number;
  voiceMinutesUsed: number;
  periodStart: string;
  periodEnd: string;
}
