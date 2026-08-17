import { Agent, Conversation, Message, Tenant, Workspace, Permission, ToolCall } from '@prisma/client';
import { prisma } from '../../config/db';
import { llmService } from '../../services/llm.service';
import { LLMResponse } from '../../services/llm.service';
import { logger } from '../../utils/logger';
import { gmailListThreads, gmailGetThread, gmailDraftReply, gmailSendWithApproval } from '../../services/tools/gmail.tools';
import { calendarListEvents, calendarGetEvent, calendarCreateEvent, calendarUpdateEvent, calendarDeleteEvent } from '../../services/tools/calendar.tools';
import { driveListFiles, driveGetFile, driveCreateFolder, driveUploadFile, driveSearchFiles, docsCreateDocument, docsGetDocument, docsUpdateDocument, docsCreateFromTemplate, generateBrandedDocument, driveListImages, driveAnalyzeImage, driveExtractTextFromImage, driveAnalyzeWhiteboard } from '../../services/tools/drive.tools';
import { slackListChannels, slackGetMessages, slackSendMessage, slackGetChannelImages, slackAnalyzeImage, slackSummarizeChannelImages } from '../../services/tools/slack.tools';
import { memorySearch, memorySave, getActionItems, saveActionItem } from '../../services/tools/memory.tools';
import { getUrgentEmails, getEmailsRequiringReply, getEmailTriageSummary, triggerEmailTriage, getWatchlistAlerts, addToWatchlist, getWatchlistItems } from '../../services/tools/triage.tools';
import { analyzeImageFromUrl } from '../../services/vision.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { memoryService } from '../memory/memory.service';
import { billingService, incrementUsage } from '../billing/billing.service';

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
    const timeZone = agent.morningBriefingTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date().toLocaleString('en-US', { 
      timeZone,
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

    prompt += `
DRIVE & DOCUMENT CAPABILITIES:
- You can read, search, and create files in Google Drive.
- You can create professional branded documents: proposals, invoices, meeting notes, reports, statements of work.
- When user asks to "create a proposal", "write an invoice", "generate a report", "draft a statement of work", "write meeting notes" → use generate_branded_document tool immediately.
- When creating branded documents, gather: recipient/client name, key details, then confirm before generating.
- After creating any document, ALWAYS provide the webViewLink so the user can open it directly.
- For invoices: ALWAYS include GST (10%) calculation as per Australian tax requirements.
- Document templates follow Australian business conventions (AUD currency, AU date formats, GST).
- When user says "save this to Drive", "create a doc", "upload a file" → use the appropriate Drive tool.
- When searching Drive, use drive_search_files for full-text search or drive_list_files with a query for name-based search.
- Always confirm successful document creation with the document link formatted as a clickable URL.
`;

    prompt += `
VISION & IMAGE ANALYSIS CAPABILITIES:
- You can analyze images from Google Drive and Slack using AI vision (GPT-4o).
- You can extract text from images (OCR) — useful for photos of documents, receipts, business cards, screenshots.
- You can analyze whiteboards — extract all text, action items, decisions, and describe diagrams.
- You can analyze charts and graphs — describe data, trends, and key insights.
- You can analyze images shared by users directly in the chat.
- You can retrieve images shared in Slack channels.

When to use vision tools:
- User asks "what's in this image" or shares an image URL → use analyze_image_from_url
- User asks about a Drive image file → use drive_analyze_image
- User asks to "extract text", "read this document/photo", "OCR" → use drive_extract_text_from_image
- User asks to "analyze the whiteboard" or "read the whiteboard from our meeting" → use drive_analyze_whiteboard
- User asks "what images were shared in Slack" or "show me images from #channel" → use slack_get_channel_images
- User asks to "analyze an image from Slack" → use slack_analyze_image

Output guidelines for vision results:
- For whiteboards: ALWAYS list action items and decisions in separate sections.
- For documents/OCR: preserve the structure and formatting of extracted text.
- For charts: describe the chart type, key data points, trends, and the main insight.
- Always describe what you see clearly and extract actionable information.
`;

    if (agent.systemPromptAppendix) {
      prompt += `\nADDITIONAL INSTRUCTIONS:\n${agent.systemPromptAppendix}\n`;
    }

    prompt += `
EMAIL TRIAGE & WATCHLIST:
- You have an email triage system that classifies emails by priority: URGENT, IMPORTANT, NORMAL, LOW, SPAM
- When user asks "what needs my attention" or "urgent emails" → use get_urgent_emails tool
- When user asks "what emails need replies" → use get_emails_requiring_reply tool
- When user asks to "watch" someone or something → use add_to_watchlist tool
- When user asks "any alerts" or "watchlist" → use get_watchlist_alerts tool
- Always trigger triage when user asks about email priorities for fresh results
- For urgent emails: always suggest drafting a reply or creating an action item
- Triage uses: tenantId="${tenant.id}", agentId="${agent.id}"
`;

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
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, summary: { type: 'string' }, description: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' }, timeZone: { type: 'string', description: 'IANA Timezone (e.g. Asia/Karachi)' }, attendees: { type: 'array', items: { type: 'string' } } },
              required: ['workspaceId', 'summary', 'start', 'end']
            }
          });
          tools.push({
            name: 'calendar_update_event',
            description: 'Update a calendar event',
            input_schema: {
              type: 'object',
              properties: { workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' }, eventId: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' }, timeZone: { type: 'string', description: 'IANA Timezone (e.g. Asia/Karachi)' } },
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
            name: 'drive_list_images',
            description: 'List image files in Google Drive',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID from the connected workspaces list' },
                folderId: { type: 'string', description: 'Optional folder ID to search in' },
                maxResults: { type: 'number', description: 'Maximum number of results (default 20)' }
              },
              required: ['workspaceId']
            }
          });
          tools.push({
            name: 'drive_analyze_image',
            description: 'Analyze an image file from Google Drive using AI vision. Can describe content, extract text, analyze charts, read documents, and more.',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID from the connected workspaces list' },
                fileId: { type: 'string', description: 'The Drive file ID of the image to analyze' },
                question: { type: 'string', description: 'What to analyze or extract from the image' }
              },
              required: ['workspaceId', 'fileId', 'question']
            }
          });
          tools.push({
            name: 'drive_extract_text_from_image',
            description: 'Extract all text from an image file in Google Drive (OCR). Use for photos of documents, screenshots, receipts, business cards, or any image containing text.',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID from the connected workspaces list' },
                fileId: { type: 'string', description: 'The Drive file ID of the image' }
              },
              required: ['workspaceId', 'fileId']
            }
          });
          tools.push({
            name: 'drive_analyze_whiteboard',
            description: 'Analyze a whiteboard photo from Google Drive. Extracts all text, action items, decisions made, and describes any diagrams or flowcharts.',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID from the connected workspaces list' },
                fileId: { type: 'string', description: 'The Drive file ID of the whiteboard image' }
              },
              required: ['workspaceId', 'fileId']
            }
          });
          tools.push({
            name: 'drive_list_files',
            description: 'List Google Drive files with optional filters by folder, file type, or name',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                query: { type: 'string', description: 'Filter by file name (partial match)' },
                maxResults: { type: 'number' },
                folderId: { type: 'string', description: 'List files inside this folder ID' },
                mimeType: { type: 'string', description: 'Filter by MIME type, e.g. application/vnd.google-apps.document' }
              },
              required: ['workspaceId']
            }
          });
          tools.push({
            name: 'drive_get_file',
            description: 'Get a Google Drive file metadata and optionally its text content',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                fileId: { type: 'string' },
                includeContent: { type: 'boolean', description: 'Set true to export and return the file text content' }
              },
              required: ['workspaceId', 'fileId']
            }
          });
          tools.push({
            name: 'drive_search_files',
            description: 'Full-text search across all files in Google Drive',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                query: { type: 'string', description: 'Search query text' },
                maxResults: { type: 'number' }
              },
              required: ['workspaceId', 'query']
            }
          });
          tools.push({
            name: 'docs_get_document',
            description: 'Read the full text content of a Google Doc by document ID',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                documentId: { type: 'string' }
              },
              required: ['workspaceId', 'documentId']
            }
          });
        }
        if (ws.permissions.includes('DRIVE_WRITE')) {
          tools.push({
            name: 'drive_create_folder',
            description: 'Create a new folder in Google Drive',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                name: { type: 'string' },
                parentFolderId: { type: 'string' }
              },
              required: ['workspaceId', 'name']
            }
          });
          tools.push({
            name: 'drive_upload_file',
            description: 'Upload a text or markdown file to Google Drive',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                name: { type: 'string' },
                content: { type: 'string', description: 'Text content of the file' },
                mimeType: { type: 'string', description: 'MIME type, e.g. text/plain or text/markdown' },
                parentFolderId: { type: 'string' }
              },
              required: ['workspaceId', 'name', 'content']
            }
          });
          tools.push({
            name: 'docs_create_document',
            description: 'Create a new Google Doc with markdown-formatted content',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                title: { type: 'string' },
                content: { type: 'string', description: 'Document content, supports # headings, ## subheadings, - bullets' }
              },
              required: ['workspaceId', 'title', 'content']
            }
          });
          tools.push({
            name: 'docs_update_document',
            description: 'Update an existing Google Doc — replace content or append to it',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                documentId: { type: 'string' },
                content: { type: 'string' },
                append: { type: 'boolean', description: 'If true, append to end; if false (default), replace all content' }
              },
              required: ['workspaceId', 'documentId', 'content']
            }
          });
          tools.push({
            name: 'docs_create_from_template',
            description: 'Copy a Google Doc template and replace {{placeholder}} variables with provided values',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                templateId: { type: 'string', description: 'Google Drive file ID of the template document' },
                title: { type: 'string' },
                replacements: { type: 'object', description: 'Key-value pairs where keys match {{placeholder}} names in the template' }
              },
              required: ['workspaceId', 'templateId', 'title', 'replacements']
            }
          });
          tools.push({
            name: 'generate_branded_document',
            description: 'Generate a complete branded business document (proposal, invoice, meeting notes, report, or statement of work) in Google Drive',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID (not email) from the connected workspaces list' },
                type: { type: 'string', enum: ['proposal', 'invoice', 'meeting_notes', 'report', 'sow'], description: 'Document template type' },
                title: { type: 'string' },
                data: {
                  type: 'object',
                  description: 'Document data. For proposal: clientName, executiveSummary, scopeOfWork, timeline, totalValue. For invoice: clientName, invoiceNumber, lineItems (array of {description, qty, rate}), dueDate, bankName, bsb, accountNumber. For meeting_notes: attendees, date, agendaItems, discussionPoints, decisions, actionItems. For report: executiveSummary, keyFindings, analysis, recommendations. For sow: clientName, overview, deliverables, milestones, assumptions, acceptanceCriteria, commercialTerms.'
                },
                brandConfig: {
                  type: 'object',
                  properties: { companyName: { type: 'string' } }
                }
              },
              required: ['workspaceId', 'type', 'title', 'data']
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
          tools.push({
            name: 'slack_get_channel_images',
            description: 'Get all images shared in a Slack channel from recent messages',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID from the connected workspaces list' },
                channelId: { type: 'string', description: 'Slack channel ID' },
                limit: { type: 'number', description: 'Number of recent messages to check (default 50)' }
              },
              required: ['workspaceId', 'channelId']
            }
          });
          tools.push({
            name: 'slack_analyze_image',
            description: 'Analyze a specific image shared in a Slack channel using AI vision',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID from the connected workspaces list' },
                channelId: { type: 'string', description: 'Slack channel ID' },
                fileId: { type: 'string', description: 'Slack file ID of the image to analyze' },
                downloadUrl: { type: 'string', description: 'Direct download URL for the image (alternative to fileId)' },
                question: { type: 'string', description: 'What to analyze or extract from the image' }
              },
              required: ['workspaceId', 'channelId', 'question']
            }
          });
          tools.push({
            name: 'slack_summarize_channel_images',
            description: 'Get and analyze all images shared in a Slack channel in the last N hours',
            input_schema: {
              type: 'object',
              properties: {
                workspaceId: { type: 'string', description: 'The workspace UUID from the connected workspaces list' },
                channelId: { type: 'string', description: 'Slack channel ID' },
                hours: { type: 'number', description: 'How many hours back to look (default 24)' },
                question: { type: 'string', description: 'What to analyze about each image found' }
              },
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

    // Always-available vision tool (no workspace required)
    tools.push({
      name: 'analyze_image_from_url',
      description: 'Analyze any image from a URL using AI vision. Use when user shares an image URL or when analyzing publicly accessible images.',
      input_schema: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string', description: 'The URL of the image to analyze' },
          question: { type: 'string', description: 'What to analyze or extract from the image' }
        },
        required: ['imageUrl', 'question']
      }
    });

    tools.push(
      {
        name: 'get_urgent_emails',
        description: 'Get urgent and important emails that need attention, from the classified email triage system',
        input_schema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            workspaceId: { type: 'string', description: 'Optional: filter by specific workspace' },
            limit: { type: 'number', description: 'Max results (default 10)' }
          },
          required: ['tenantId']
        }
      },
      {
        name: 'get_emails_requiring_reply',
        description: 'Get emails that require a reply but have not been acted on yet',
        input_schema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            workspaceId: { type: 'string' }
          },
          required: ['tenantId']
        }
      },
      {
        name: 'get_email_triage_summary',
        description: 'Get a summary of classified emails by priority level',
        input_schema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            workspaceId: { type: 'string' }
          },
          required: ['tenantId']
        }
      },
      {
        name: 'trigger_email_triage',
        description: 'Trigger an immediate email triage and classification of recent emails',
        input_schema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            agentId: { type: 'string' }
          },
          required: ['tenantId', 'agentId']
        }
      },
      {
        name: 'get_watchlist_alerts',
        description: 'Get recent watchlist matches and alerts',
        input_schema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            unreadOnly: { type: 'boolean', description: 'Only unread alerts (default true)' }
          },
          required: ['tenantId']
        }
      },
      {
        name: 'add_to_watchlist',
        description: 'Add an email address, domain, or keyword to the watch-list to monitor',
        input_schema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            agentId: { type: 'string' },
            type: { 
              type: 'string', 
              enum: ['EMAIL_ADDRESS', 'EMAIL_DOMAIN', 'KEYWORD', 'SLACK_USER', 'SLACK_KEYWORD'],
              description: 'Type of watchlist item'
            },
            value: { type: 'string', description: 'The email, domain, or keyword to watch' },
            label: { type: 'string', description: 'Friendly label for this watchlist item' },
            alertLevel: { 
              type: 'string', 
              enum: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'],
              description: 'Alert level when matched'
            }
          },
          required: ['tenantId', 'agentId', 'type', 'value']
        }
      },
      {
        name: 'get_watchlist',
        description: 'Get all watchlist items being monitored',
        input_schema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            agentId: { type: 'string' }
          },
          required: ['tenantId', 'agentId']
        }
      }
    );

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
        case 'drive_create_folder': token = await getToken(workspaceId); result = await driveCreateFolder(token, toolInput); break;
        case 'drive_upload_file': token = await getToken(workspaceId); result = await driveUploadFile(token, toolInput); break;
        case 'drive_search_files': token = await getToken(workspaceId); result = await driveSearchFiles(token, toolInput); break;
        case 'docs_create_document': token = await getToken(workspaceId); result = await docsCreateDocument(token, toolInput); break;
        case 'docs_get_document': token = await getToken(workspaceId); result = await docsGetDocument(token, toolInput); break;
        case 'docs_update_document': token = await getToken(workspaceId); result = await docsUpdateDocument(token, toolInput); break;
        case 'docs_create_from_template': token = await getToken(workspaceId); result = await docsCreateFromTemplate(token, toolInput); break;
        case 'generate_branded_document': token = await getToken(workspaceId); result = await generateBrandedDocument(token, toolInput); break;
        case 'slack_list_channels': token = await getToken(workspaceId); result = await slackListChannels(token, toolInput); break;
        case 'slack_get_messages': token = await getToken(workspaceId); result = await slackGetMessages(token, toolInput); break;
        case 'slack_send_message': token = await getToken(workspaceId); result = await slackSendMessage(token, toolInput); break;
        case 'slack_get_channel_images': token = await getToken(workspaceId); result = await slackGetChannelImages(token, toolInput); break;
        case 'slack_analyze_image': token = await getToken(workspaceId); result = await slackAnalyzeImage(token, toolInput); break;
        case 'slack_summarize_channel_images': token = await getToken(workspaceId); result = await slackSummarizeChannelImages(token, toolInput); break;
        case 'drive_list_images': token = await getToken(workspaceId); result = await driveListImages(token, toolInput); break;
        case 'drive_analyze_image': token = await getToken(workspaceId); result = await driveAnalyzeImage(token, toolInput); break;
        case 'drive_extract_text_from_image': token = await getToken(workspaceId); result = await driveExtractTextFromImage(token, toolInput); break;
        case 'drive_analyze_whiteboard': token = await getToken(workspaceId); result = await driveAnalyzeWhiteboard(token, toolInput); break;
        case 'analyze_image_from_url': result = await analyzeImageFromUrl(toolInput.imageUrl, toolInput.question); break;
        case 'memory_search': result = await memorySearch(prisma, { ...toolInput, tenantId }); break;
        case 'memory_save': result = await memorySave(prisma, { ...toolInput, tenantId, agentId }); break;
        case 'get_action_items': result = await getActionItems(prisma, { ...toolInput, tenantId, agentId }); break;
        case 'save_action_item': result = await saveActionItem(prisma, { ...toolInput, tenantId, agentId }); break;
        case 'get_urgent_emails': result = await getUrgentEmails(prisma, toolInput); break;
        case 'get_emails_requiring_reply': result = await getEmailsRequiringReply(prisma, toolInput); break;
        case 'get_email_triage_summary': result = await getEmailTriageSummary(prisma, toolInput); break;
        case 'trigger_email_triage': result = await triggerEmailTriage(prisma, toolInput); break;
        case 'get_watchlist_alerts': result = await getWatchlistAlerts(prisma, toolInput); break;
        case 'add_to_watchlist': result = await addToWatchlist(prisma, toolInput); break;
        case 'get_watchlist': result = await getWatchlistItems(prisma, toolInput); break;
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
      const safeStringify = (obj: any) => JSON.stringify(obj, (key, value) => {
        if (typeof value === 'string' && value.length > 5000) {
          return value.substring(0, 5000) + '... [TRUNCATED]';
        }
        return value;
      });

      await prisma.toolCall.create({
        data: {
          tenantId,
          agentId,
          workspaceId: workspaceId || null, // only set if provided and verified
          toolName,
          inputJson: safeStringify(toolInput),
          outputJson: safeStringify(result),
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
    const messages: any[] = [];
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

        messages.push(responseMessage);

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

      // After final response is assembled, get total tokens used
      const totalTokens = messages.reduce((acc, msg: any) => {
        return acc + (msg.usage?.output_tokens || 0) + (msg.usage?.input_tokens || 0)
      }, 0)

      // Increment usage
      await incrementUsage(tenantId, {
        toolCalls: toolCallsMade.length,
        tokens: totalTokens,
        voiceMinutes: 0
      })

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
