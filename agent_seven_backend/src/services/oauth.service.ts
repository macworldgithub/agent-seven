import { google } from 'googleapis';
import { env } from '../config/env';

const googleOAuth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

export const getGoogleAuthUrl = (state: string): string => {
  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
  ];

  return googleOAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state,
  });
};

export const exchangeGoogleCode = async (
  code: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
  providerAccountId: string;
}> => {
  const { tokens } = await googleOAuth2Client.getToken(code);
  googleOAuth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: googleOAuth2Client,
    version: 'v2',
  });

  const { data: userInfo } = await oauth2.userinfo.get();

  if (!userInfo.email || !userInfo.id) {
    throw new Error('Failed to retrieve user email or id from Google');
  }

  return {
    accessToken: tokens.access_token as string,
    refreshToken: tokens.refresh_token as string,
    expiresAt: new Date(tokens.expiry_date as number),
    email: userInfo.email,
    providerAccountId: userInfo.id,
  };
};

export const refreshGoogleToken = async (
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> => {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    accessToken: credentials.access_token as string,
    expiresAt: new Date(credentials.expiry_date as number),
  };
};

export const getSlackAuthUrl = (state: string): string => {
  const scopes = [
    'channels:read',
    'channels:history',
    'chat:write',
    'users:read',
    'files:read',
    'groups:read',
    'groups:history',
    'im:read',
    'im:history',
    'mpim:read',
    'mpim:history',
  ];
  
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    user_scope: scopes.join(','),
    redirect_uri: env.SLACK_REDIRECT_URI,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
};

export const exchangeSlackCode = async (
  code: string
): Promise<{
  accessToken: string;
  teamId: string;
  teamName: string;
  botUserId: string;
  email?: string;
}> => {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: env.SLACK_REDIRECT_URI,
  });

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack OAuth Error: ${data.error}`);
  }

  // To get user email we need to call users.info if authed_user exists
  let email;
  const userToken = data.authed_user?.access_token || data.access_token;
  if (data.authed_user && data.authed_user.id) {
    const userRes = await fetch(`https://slack.com/api/users.info?user=${data.authed_user.id}`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      }
    });
    const userData = await userRes.json();
    if (userData.ok && userData.user && userData.user.profile) {
      email = userData.user.profile.email;
    }
  }

  return {
    accessToken: userToken,
    teamId: data.team?.id || '',
    teamName: data.team?.name || 'Slack Workspace',
    botUserId: data.bot_user_id || '',
    email,
  };
};
