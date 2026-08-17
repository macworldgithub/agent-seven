import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { logger } from '../../utils/logger';
import { analyzeImageFromBase64, imageUrlToBase64 } from '../vision.service';

export async function slackListChannels(accessToken: string, input: {}): Promise<any> {
  const slack = new WebClient(accessToken);
  const res = await slack.conversations.list({
    types: 'public_channel,private_channel,mpim,im',
    exclude_archived: true
  });

  return (res.channels || []).map(c => ({
    channelId: c.id,
    name: c.name,
    isPrivate: c.is_private,
    memberCount: c.num_members,
    topic: c.topic?.value
  }));
}

export const slackGetMessages = async (accessToken: string, input: { channelId: string, limit?: number }) => {
  try {
    const client = new WebClient(accessToken);
    
    // Join the channel first (bot needs to be a member to read messages)
    try {
      await client.conversations.join({ channel: input.channelId });
    } catch (joinError: any) {
      // Ignore if already a member or can't join private channels
      logger.warn(`Could not join channel ${input.channelId}: ${joinError.message}`);
    }
    
    const result = await client.conversations.history({
      channel: input.channelId,
      limit: input.limit || 20
    });
    
    const messages = await Promise.all(
      (result.messages || []).map(async (msg) => {
        let userName = 'Unknown';
        try {
          if (msg.user) {
            const userInfo = await client.users.info({ user: msg.user });
            userName = userInfo.user?.real_name || userInfo.user?.name || 'Unknown';
          }
        } catch (e) {}
        
        return {
          messageId: msg.ts,
          userId: msg.user,
          userName,
          text: msg.text,
          timestamp: new Date(parseFloat(msg.ts || '0') * 1000).toISOString(),
          reactions: msg.reactions,
          files: (msg.files || []).map((f: any) => ({
            fileId: f.id,
            fileName: f.name,
            mimeType: f.mimetype,
            isImage: f.mimetype?.startsWith('image/'),
            url: f.url_private_download,
            thumbnail: f.thumb_360,
          })),
        };
      })
    );
    
    return messages;
  } catch (error: any) {
    logger.error(`Slack getMessages error: ${error.message} | Code: ${error.code}`);
    throw error;
  }
};

export async function slackSendMessage(accessToken: string, input: { channelId: string, text: string }): Promise<any> {
  const slack = new WebClient(accessToken);
  const res = await slack.chat.postMessage({
    channel: input.channelId,
    text: input.text
  });

  return {
    success: res.ok,
    messageId: res.ts,
    channelId: res.channel,
    timestamp: res.ts
  };
}

// ─── Vision Tools ─────────────────────────────────────────────────────────────

/**
 * Get all images shared in a Slack channel (from recent messages).
 */
export async function slackGetChannelImages(
  accessToken: string,
  input: { channelId: string; limit?: number }
): Promise<any> {
  const client = new WebClient(accessToken);

  try {
    await client.conversations.join({ channel: input.channelId });
  } catch (_) {}

  const result = await client.conversations.history({
    channel: input.channelId,
    limit: input.limit || 50,
  });

  const images: any[] = [];

  for (const msg of result.messages || []) {
    if (!msg.files || msg.files.length === 0) continue;

    let userName = 'Unknown';
    try {
      if (msg.user) {
        const userInfo = await client.users.info({ user: msg.user });
        userName = userInfo.user?.real_name || userInfo.user?.name || 'Unknown';
      }
    } catch (_) {}

    for (const file of msg.files as any[]) {
      if (!file.mimetype?.startsWith('image/')) continue;

      images.push({
        messageId: msg.ts,
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimetype,
        userName,
        timestamp: new Date(parseFloat(msg.ts || '0') * 1000).toISOString(),
        messageText: msg.text || '',
        downloadUrl: file.url_private_download,
        thumbnail: file.thumb_360,
        width: file.original_w,
        height: file.original_h,
      });
    }
  }

  return {
    totalImages: images.length,
    images,
  };
}

/**
 * Analyze a specific Slack image file using AI vision.
 */
export async function slackAnalyzeImage(
  accessToken: string,
  input: { channelId: string; fileId?: string; downloadUrl?: string; question: string }
): Promise<any> {
  let downloadUrl = input.downloadUrl;
  let fileName = 'image';
  let mimeType = 'image/jpeg';
  let timestamp = '';

  if (!downloadUrl && input.fileId) {
    // Look up the file to get its download URL
    const client = new WebClient(accessToken);
    try {
      const fileInfo = await client.files.info({ file: input.fileId });
      const file = fileInfo.file as any;
      downloadUrl = file?.url_private_download;
      fileName = file?.name || 'image';
      mimeType = file?.mimetype || 'image/jpeg';
      timestamp = file?.timestamp ? new Date(file.timestamp * 1000).toISOString() : '';
    } catch (err: any) {
      throw new Error(`Could not retrieve Slack file info for ${input.fileId}: ${err.message}`);
    }
  }

  if (!downloadUrl) {
    throw new Error('No download URL available for Slack image');
  }

  // Slack requires Bearer auth header for private file downloads
  const { base64, mimeType: detectedMimeType } = await imageUrlToBase64(downloadUrl, accessToken);

  const analysis = await analyzeImageFromBase64(
    base64,
    detectedMimeType || mimeType,
    input.question
  );

  return {
    analysis,
    fileName,
    mimeType: detectedMimeType || mimeType,
    timestamp,
  };
}

/**
 * Fetch and analyze all images shared in a channel in the last N hours.
 */
export async function slackSummarizeChannelImages(
  accessToken: string,
  input: { channelId: string; hours?: number; question?: string }
): Promise<any> {
  const hours = input.hours ?? 24;
  const oldestTs = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000).toString();
  const client = new WebClient(accessToken);

  try {
    await client.conversations.join({ channel: input.channelId });
  } catch (_) {}

  const result = await client.conversations.history({
    channel: input.channelId,
    oldest: oldestTs,
    limit: 200,
  });

  const question = input.question || 'Describe what is shown in this image and any key information it contains.';
  const analyses: any[] = [];

  for (const msg of result.messages || []) {
    if (!msg.files || msg.files.length === 0) continue;

    let userName = 'Unknown';
    try {
      if (msg.user) {
        const userInfo = await client.users.info({ user: msg.user });
        userName = userInfo.user?.real_name || userInfo.user?.name || 'Unknown';
      }
    } catch (_) {}

    for (const file of msg.files as any[]) {
      if (!file.mimetype?.startsWith('image/')) continue;

      try {
        const { base64, mimeType } = await imageUrlToBase64(file.url_private_download, accessToken);
        const analysis = await analyzeImageFromBase64(base64, mimeType, question);
        analyses.push({
          fileName: file.name,
          userName,
          timestamp: new Date(parseFloat(msg.ts || '0') * 1000).toISOString(),
          messageText: msg.text || '',
          analysis,
        });
      } catch (err: any) {
        logger.warn(`Could not analyze Slack image ${file.name}: ${err.message}`);
        analyses.push({
          fileName: file.name,
          userName,
          timestamp: new Date(parseFloat(msg.ts || '0') * 1000).toISOString(),
          error: `Could not analyze: ${err.message}`,
        });
      }
    }
  }

  return {
    channelId: input.channelId,
    hoursSearched: hours,
    totalImages: analyses.length,
    analyses,
  };
}
