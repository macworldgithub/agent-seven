import { Agent, Conversation, Message, Tenant, Workspace, Permission, ToolCall } from '@prisma/client';
import { prisma } from '../../config/db';
import { llmService } from '../../services/llm.service';
import { LLMResponse } from '../../services/llm.service';
import { logger } from '../../utils/logger';
import { gmailListThreads, gmailGetThread, gmailDraftReply, gmailSendWithApproval } from '../../services/tools/gmail.tools';
import { calendarListEvents, calendarGetEvent, calendarCreateEvent, calendarUpdateEvent, calendarDeleteEvent } from '../../services/tools/calendar.tools';
import { driveListFiles, driveGetFile } from '../../services/tools/drive.tools';
import { slackListChannels, slackGetMessages, slackSendMessage } from '../../services/tools/slack.tools';
import { memorySearch, memorySave, getActionItems, saveActionItem } from '../../services/tools/memory.tools';
import { WorkspaceService } from '../workspace/workspace.service';
import { memoryService } from '../memory/memory.service';
import { billingService } from '../billing/billing.service';

export const agentService = {
  async getOrCreateAgent(tenantId: string): Promise<Agent> {
    let agent = await prisma.agent.findFirst({
      where: { tenantId }
    });

    if (!agent) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new Error('Tenant not found');

      agent = await prisma.agent.create({
        data: {
          tenantId,
          name: 'Agent Seven',
          spokenName: 'Seven',
        }
      });
    }

    return agent;
  },

  async updateAgentConfig(tenantId: string, data: Partial<Agent>): Promise<Agent> {
    const agent = await this.getOrCreateAgent(tenantId);
    return prisma.agent.update({
      where: { id: agent.id },
      data: {
        name: data.name,
        spokenName: data.spokenName,
        systemPromptAppendix: data.systemPromptAppendix,
        personalityPreset: data.personalityPreset,
        morningBriefingEnabled: data.morningBriefingEnabled,
        morningBriefingTime: data.morningBriefingTime,
        morningBriefingTimezone: data.morningBriefingTimezone,
        driftDetectionEnabled: data.driftDetectionEnabled,
        replyTrackingEnabled: data.replyTrackingEnabled,
        watchlistEnabled: data.watchlistEnabled,
      }
    });
  },

  buildSystemPrompt(agent: Agent, tenant: Tenant, workspaces: Workspace[]): string {
    const now = new Date().toLocaleString('en-AU', { 
      timeZone: agent.morningBriefingTimezone || 'Australia/Sydney',
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    let prompt = `You are ${agent.name}, an AI assistant. Your personality is ${agent.personalityPreset}.
Current date and time: ${now}

TRUTHFULNESS RULES:
- Never claim a tool succeeded without a verified result from a tool call.
- Do not make up information.
- Use the available tools to fetch necessary data.

MEMORY CONTEXT:
- Use memory_search to find historical context and user preferences.
- Save important information using memory_save.

TOOL USAGE RULES — MANDATORY:
- When user says "remind me", "I need to", "follow up", "don't forget", "schedule", "plan to" → you MUST call save_action_item tool immediately. Do not just acknowledge in text.
- When user lists multiple tasks → call save_action_item once for EACH task separately.
- Never say "I have set up reminders" without actually calling the save_action_item tool first.
- After calling save_action_item, confirm to the user with the saved item details.
- tenantId to use: "${tenant.id}"
- agentId to use: "${agent.id}"

AU-NATIVE DEFAULTS:
- Assume GST/BAS awareness for financial queries.
- Ensure alignment with the Australian Privacy Act.

GMAIL TOOL USAGE:
- If the user asks to "send" an email (e.g., "send an email", "send this", "email him"), YOU MUST call gmail_send_with_approval with requiresApproval: false to send it immediately.
- If the user asks to "draft", "prepare", or "write", call gmail_send_with_approval with requiresApproval: true to create a draft.

CONNECTED WORKSPACES (always use the exact Workspace ID when calling tools):
`;

    if (workspaces.length === 0) {
      prompt += "- No workspaces connected.\n";
    } else {
      const workspaceList = workspaces.map(ws =>
        `- Workspace ID: "${ws.id}" | Name: "${ws.name}" | Provider: ${ws.provider} | Email: ${(ws as any).providerEmail ?? 'N/A'} | Permissions: ${ws.permissions.join(', ')}`
      ).join('\n');
      prompt += workspaceList + '\n';
    }

    prompt += `
IMPORTANT: When calling any tool that requires workspaceId, always use the "Workspace ID" value shown above (a UUID like "22343d68-b05c-43d1-8d21-24e2483bb68d"), never use the email or name.
`;

    if (agent.systemPromptAppendix) {
      prompt += `\nADDITIONAL INSTRUCTIONS:\n${agent.systemPromptAppendix}\n`;
    }

    return prompt;
  },

  getEnabledTools(workspaces: Workspace[]): any[] {
    const tools: any[] = [
      {
        name: 'memory_search',
        description: 'Search past memories or conversations',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            type: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'memory_save',
        description: 'Save important context or preferences to memory',
        input_schema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'One of: CONVERSATION, DECISION, ACTION_ITEM, STAKEHOLDER, KNOWLEDGE_SNIPPET' },
            title: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          },
          required: ['type', 'title', 'content']
        }
      },
      {
        name: 'get_action_items',
        description: 'Retrieve pending or completed action items',
        input_schema: {
          type: 'object',
          properties: {
            status: { type: 'string' }
          }
        }
      },
      {
        name: 'save_action_item',
        description: 'Save a new action item',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            dueAt: { type: 'string' }
          },
          required: ['title']
        }
      }
    ];

    workspaces.forEach(ws => {
      if (ws.provider === 'GOOGLE') {
        if (ws.permissions.includes('READ_EMAIL')) {
          tools.push({
            name: 'gmail_list_threads',
            description: 'List Gmail threads',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, maxResults: { type: 'number' }, query: { type: 'string' } },
              required: ['workspaceId']
            }
          });
          tools.push({
            name: 'gmail_get_thread',
            description: 'Get a specific Gmail thread',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, threadId: { type: 'string' } },
              required: ['workspaceId', 'threadId']
            }
          });
        }
        if (ws.permissions.includes('DRAFT_EMAIL')) {
          tools.push({
            name: 'gmail_draft_reply',
            description: 'Draft a reply to a Gmail thread or a new email',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, threadId: { type: 'string' }, to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } },
              required: ['workspaceId', 'body']
            }
          });
        }
        if (ws.permissions.includes('SEND_EMAIL_WITH_APPROVAL')) {
          tools.push({
            name: 'gmail_send_with_approval',
            description: 'Send a new email or reply. Can send immediately or create a draft for user approval.',
            input_schema: {
              type: 'object',
              properties: { 
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, 
                threadId: { type: 'string' }, 
                to: { type: 'string' }, 
                subject: { type: 'string' }, 
                body: { type: 'string' }, 
                requiresApproval: { type: 'boolean', description: 'CRITICAL: Set to false to send the email immediately. Set to true to just create a draft for the user to review.' } 
              },
              required: ['workspaceId', 'body', 'requiresApproval']
            }
          });
        }
        if (ws.permissions.includes('CALENDAR_READ')) {
          tools.push({
            name: 'calendar_list_events',
            description: 'List calendar events',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, timeMin: { type: 'string' }, timeMax: { type: 'string' }, maxResults: { type: 'number' } },
              required: ['workspaceId']
            }
          });
          tools.push({
            name: 'calendar_get_event',
            description: 'Get a specific calendar event',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, eventId: { type: 'string' } },
              required: ['workspaceId', 'eventId']
            }
          });
        }
        if (ws.permissions.includes('CALENDAR_WRITE')) {
          tools.push({
            name: 'calendar_create_event',
            description: 'Create a calendar event',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, summary: { type: 'string' }, description: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' }, attendees: { type: 'array', items: { type: 'string' } } },
              required: ['workspaceId', 'summary', 'start', 'end']
            }
          });
          tools.push({
            name: 'calendar_update_event',
            description: 'Update a calendar event',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, eventId: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' } },
              required: ['workspaceId', 'eventId']
            }
          });
          tools.push({
            name: 'calendar_delete_event',
            description: 'Delete a calendar event',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, eventId: { type: 'string' } },
              required: ['workspaceId', 'eventId']
            }
          });
        }
        if (ws.permissions.includes('DRIVE_READ')) {
          tools.push({
            name: 'drive_list_files',
            description: 'List Google Drive files',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, query: { type: 'string' }, maxResults: { type: 'number' } },
              required: ['workspaceId']
            }
          });
          tools.push({
            name: 'drive_get_file',
            description: 'Get a Google Drive file',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, fileId: { type: 'string' } },
              required: ['workspaceId', 'fileId']
            }
          });
        }
      } else if (ws.provider === 'SLACK') {
        if (ws.permissions.includes('SLACK_READ')) {
          tools.push({
            name: 'slack_list_channels',
            description: 'List Slack channels',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' } },
              required: ['workspaceId']
            }
          });
          tools.push({
            name: 'slack_get_messages',
            description: 'Get Slack messages from a channel',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, channelId: { type: 'string' }, limit: { type: 'number' } },
              required: ['workspaceId', 'channelId']
            }
          });
        }
        if (ws.permissions.includes('SLACK_SEND')) {
          tools.push({
            name: 'slack_send_message',
            description: 'Send a Slack message',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, channelId: { type: 'string' }, text: { type: 'string' } },
              required: ['workspaceId', 'channelId', 'text']
            }
          });
        }
      }
    });

    return tools;
  },

  async executeTool(toolName: string, toolInput: any, tenantId: string, agentId: string): Promise<{ success: boolean, result: any, error?: string }> {
    const startTime = Date.now();
    let success = false;
    let result: any = null;
    let errorMessage: string | undefined;

    try {
      const workspaceId = toolInput.workspaceId;
      const getToken = async (wid: string) => {
        const ws = await WorkspaceService.getWorkspaceWithDecryptedToken(wid, tenantId);
        return ws.decryptedAccessToken;
      };

      let token;
      switch(toolName) {
        case 'gmail_list_threads': token = await getToken(workspaceId); result = await gmailListThreads(token, toolInput); break;
        case 'gmail_get_thread': token = await getToken(workspaceId); result = await gmailGetThread(token, toolInput); break;
        case 'gmail_draft_reply': token = await getToken(workspaceId); result = await gmailDraftReply(token, toolInput); break;
        case 'gmail_send_with_approval': token = await getToken(workspaceId); result = await gmailSendWithApproval(token, toolInput); break;
        case 'calendar_list_events': token = await getToken(workspaceId); result = await calendarListEvents(token, toolInput); break;
        case 'calendar_get_event': token = await getToken(workspaceId); result = await calendarGetEvent(token, toolInput); break;
        case 'calendar_create_event': token = await getToken(workspaceId); result = await calendarCreateEvent(token, toolInput); break;
        case 'calendar_update_event': token = await getToken(workspaceId); result = await calendarUpdateEvent(token, toolInput); break;
        case 'calendar_delete_event': token = await getToken(workspaceId); result = await calendarDeleteEvent(token, toolInput); break;
        case 'drive_list_files': token = await getToken(workspaceId); result = await driveListFiles(token, toolInput); break;
        case 'drive_get_file': token = await getToken(workspaceId); result = await driveGetFile(token, toolInput); break;
        case 'slack_list_channels': token = await getToken(workspaceId); result = await slackListChannels(token, toolInput); break;
        case 'slack_get_messages': token = await getToken(workspaceId); result = await slackGetMessages(token, toolInput); break;
        case 'slack_send_message': token = await getToken(workspaceId); result = await slackSendMessage(token, toolInput); break;
        case 'memory_search': result = await memorySearch(prisma, { ...toolInput, tenantId }); break;
        case 'memory_save': result = await memorySave(prisma, { ...toolInput, tenantId, agentId }); break;
        case 'get_action_items': result = await getActionItems(prisma, { ...toolInput, tenantId, agentId }); break;
        case 'save_action_item': result = await saveActionItem(prisma, { ...toolInput, tenantId, agentId }); break;
        default: throw new Error(`Unknown tool: ${toolName}`);
      }
      success = true;
    } catch (err: any) {
      success = false;
      errorMessage = err.message || 'Unknown error';
    }

    const durationMs = Date.now() - startTime;

    const workspaceId = toolInput.workspaceId || null;

    // Before logging, verify the workspaceId actually belongs to this tenant
    if (workspaceId) {
      const ws = await prisma.workspace.findFirst({
        where: { id: workspaceId, tenantId }
      });
      if (!ws) {
        throw new Error(`Workspace ${workspaceId} not found for tenant ${tenantId}`);
      }
    }

    try {
      await prisma.toolCall.create({
        data: {
          tenantId,
          agentId,
          workspaceId: workspaceId || null, // only set if provided and verified
          toolName,
          inputJson: JSON.stringify(toolInput),
          outputJson: JSON.stringify(result),
          success: true,
          durationMs,
          modelUsed: 'gpt-4o'
        }
      });
    } catch (logError) {
      logger.warn(`Failed to log tool call: ${logError}`);
      // don't throw — logging failure should never break agent execution
    }

    return { success, result, error: errorMessage };
  },

  async runAgentLoop(params: { tenantId: string, userId: string, conversationId: string | null, userMessage: string, stream?: boolean, onChunk?: (chunk: string) => void }): Promise<{ response: string, conversationId: string, toolCallsMade: string[] }> {
    const { tenantId, userId, userMessage, stream, onChunk } = params;
    
    const { allowed, reason } = await billingService.checkUsageLimits(tenantId);
    if (!allowed) {
      return {
        response: `⚠️ ${reason} Visit your billing page to upgrade.`,
        conversationId: params.conversationId || '',
        toolCallsMade: []
      };
    }

    // 1. Get agent + tenant + workspaces
    const agent = await this.getOrCreateAgent(tenantId);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');
    const workspaces = await prisma.workspace.findMany({ where: { tenantId, status: { not: 'REVOKED' } } });

    // 2. Get or create Conversation
    let conversationId = params.conversationId;
    if (!conversationId) {
      const conv = await prisma.conversation.create({
        data: {
          tenantId,
          userId,
          agentId: agent.id,
          title: userMessage.substring(0, 50)
        }
      });
      conversationId = conv.id;
    }

    // 3. Save user Message to DB
    await prisma.message.create({
      data: {
        tenantId,
        conversationId,
        role: 'USER',
        content: userMessage
      }
    });

    // 4. Load memory context
    const recentMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    recentMessages.reverse();

    const relevantMemories = await memoryService.loadContextForConversation(tenantId, agent.id, userMessage, 5);
    
    // 5. Build system prompt
    let systemPrompt = this.buildSystemPrompt(agent, tenant, workspaces);
    const memoryContext = relevantMemories.length > 0
      ? `\n\nRelevant memory context:\n${relevantMemories.map(m => `[${m.type}] ${m.title}: ${m.content}`).join('\n')}`
      : '';
    systemPrompt = systemPrompt + memoryContext;

    // 6. Get enabled tools
    const tools = this.getEnabledTools(workspaces);

    // 7. Build messages array for LLM
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string | any[] }> = recentMessages.map(m => {
      // For simplicity in this basic loop, we only pass standard text content for history.
      // toolCallsJson only stores an array of tool names, which cannot be converted to 
      // valid Anthropic/OpenAI tool call history objects.
      return { role: m.role.toLowerCase() as 'user' | 'assistant', content: m.content || "" };
    });

    const toolCallsMade: string[] = [];
    let finalResponseText = '';
    let iterations = 0;
    const maxIterations = 5;

    await prisma.agent.update({ where: { id: agent.id }, data: { status: 'THINKING' } });

    try {
      while (iterations < maxIterations) {
        iterations++;
        
        let responseMessage;
        if (stream && onChunk) {
          responseMessage = await llmService.streamWithSonnet(anthropicMessages, tools, systemPrompt, onChunk);
        } else {
          responseMessage = await llmService.reasonWithSonnet(anthropicMessages, tools, systemPrompt);
        }

        // Accumulate text content from the response
        if (responseMessage.content) {
          finalResponseText += responseMessage.content;
        }

        // Build assistant message for history (Anthropic-compatible format understood by toOpenAIMessages)
        const assistantContent: any[] = [];
        if (responseMessage.content) {
          assistantContent.push({ type: 'text', text: responseMessage.content });
        }
        for (const tc of responseMessage.tool_calls) {
          assistantContent.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
        }
        anthropicMessages.push({
          role: 'assistant',
          content: assistantContent.length > 0 ? assistantContent : (responseMessage.content ?? ''),
        });

        if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
          break; // No tools called, we're done
        }

        await prisma.agent.update({ where: { id: agent.id }, data: { status: 'EXECUTING' } });

        // Execute each tool and collect results in OpenAI tool-result format
        const toolResultsContent: any[] = [];
        for (const toolCall of responseMessage.tool_calls) {
          toolCallsMade.push(toolCall.name);
          const toolRes = await this.executeTool(toolCall.name, toolCall.input, tenantId, agent.id);
          await billingService.incrementUsage(tenantId, 1);
          toolResultsContent.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: toolRes.success ? JSON.stringify(toolRes.result) : `Error: ${toolRes.error}`,
          });
        }

        anthropicMessages.push({
          role: 'user',
          content: toolResultsContent,
        });
        
        await prisma.agent.update({ where: { id: agent.id }, data: { status: 'THINKING' } });
      }

      // 11. Save assistant Message to DB
      await prisma.message.create({
        data: {
          tenantId,
          conversationId,
          role: 'ASSISTANT',
          content: finalResponseText,
          toolCallsJson: toolCallsMade.length > 0 ? JSON.stringify(toolCallsMade) : null,
          modelUsed: 'gpt-4o'
        }
      });

      // 13. Write AuditLog
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'agent.message',
          resourceType: 'Conversation',
          resourceId: conversationId
        }
      });

    } finally {
      // 12. Update agent status back to IDLE
      await prisma.agent.update({ where: { id: agent.id }, data: { status: 'IDLE' } });
    }

    return { response: finalResponseText, conversationId, toolCallsMade };
  },

  async getConversations(tenantId: string, userId: string): Promise<Conversation[]> {
    return prisma.conversation.findMany({
      where: { tenantId, userId },
      orderBy: { updatedAt: 'desc' }
    });
  },

  async getConversationMessages(conversationId: string, tenantId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { conversationId, tenantId },
      orderBy: { createdAt: 'asc' }
    });
  },

  async deleteConversation(conversationId: string, tenantId: string): Promise<void> {
    await prisma.conversation.delete({
      where: { id: conversationId, tenantId }
    });
  }
};
