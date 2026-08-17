import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { env } from '../../config/env';
import { google } from 'googleapis';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.register(req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'Email already exists') {
        res.status(409).json({ success: false, error: error.message });
      } else {
        next(error);
      }
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.login(req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'User not found' || error.message === 'Invalid credentials') {
        res.status(401).json({ success: false, error: error.message });
      } else {
        next(error);
      }
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: 'Missing refreshToken' });
      }
      const data = await AuthService.refreshToken(refreshToken);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'Invalid or expired refresh token') {
        res.status(401).json({ success: false, error: error.message });
      } else {
        next(error);
      }
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const tenantId = req.tenantId!;
      const data = await AuthService.getMe(userId, tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      next(error);
    }
  }

  static async google(req: Request, res: Response, next: NextFunction) {
    try {
      const referer = req.headers.referer;
      let returnToUrl = env.FRONTEND_URL;
      if (referer) {
        try {
          returnToUrl = new URL(referer).origin;
        } catch (e) {}
      }

      const stateObj = { action: 'auth_login', returnToUrl };
      const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

      const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile'],
        state,
      });

      res.redirect(url);
    } catch (error) {
      next(error);
    }
  }

  static async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query;
      if (!code) {
        return res.status(400).json({ success: false, error: 'Missing code' });
      }

      const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );

      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      const data = await AuthService.googleSSO({
        googleId: userInfo.data.id!,
        email: userInfo.data.email!,
        name: userInfo.data.name || 'Google User',
        avatar: userInfo.data.picture || undefined,
      });

      let returnToUrl = env.FRONTEND_URL;
      if (state && typeof state === 'string') {
        if (state !== 'auth_login') {
          try {
            const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
            if (decoded.returnToUrl) {
              returnToUrl = decoded.returnToUrl;
            }
          } catch (e) {
            // ignore parsing error, fallback to env.FRONTEND_URL
          }
        }
      }

      res.redirect(`${returnToUrl}/auth/callback?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}`);
    } catch (error) {
      next(error);
    }
  }
}
