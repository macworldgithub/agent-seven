export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
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
  personality: string;
  morningBriefingEnabled: boolean;
  morningBriefingTime: string | null;
  morningBriefingTimezone: string | null;
  proactiveDriftDetection: boolean;
  proactiveReplyTracking: boolean;
  proactiveWatchlist: boolean;
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
