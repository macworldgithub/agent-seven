import { WebClient } from '@slack/web-api';
import { logger } from '../../utils/logger';

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
          reactions: msg.reactions
        };
      })
    );
    
    return messages;
  } catch (error: any) {
    logger.error(`Slack getMessages error: ${error.message} | Code: ${error.code}`);
    throw error;
  }
}

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
