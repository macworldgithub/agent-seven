import { prisma } from '../../config/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';

export class AuthService {
  static async register(data: { name: string; email: string; password?: string; tenantName: string; isGoogleSSO?: boolean; googleId?: string; avatar?: string }) {
    const { name, email, password, tenantName, isGoogleSSO, googleId, avatar } = data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    let slug = tenantName.toLowerCase().replace(/\s+/g, '-');
    const randomChars = crypto.randomBytes(2).toString('hex');
    slug = `${slug}-${randomChars}`;

    const encryptionKey = crypto.randomBytes(16).toString('hex');

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug,
        encryptionKey,
      },
    });

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        tenantId: tenant.id,
        isOrgAdmin: true,
        googleId,
        avatar,
        lastLoginAt: new Date(),
      },
    });

    const agent = await prisma.agent.create({
      data: {
        tenantId: tenant.id,
        name: 'Alisa',
        spokenName: 'Alisa',
      },
    });

    const payload = {
      id: user.id,
      tenantId: tenant.id,
      email: user.email,
      isOrgAdmin: user.isOrgAdmin,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { user, tenant, agent, accessToken, refreshToken };
  }

  static async login(data: { email: string; password?: string }) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({ 
      where: { email }, 
      include: { tenant: { include: { agents: true } } } 
    });
    if (!user) {
      throw new Error('User not found');
    }

    if (password) {
      if (!user.passwordHash) {
        throw new Error('Invalid credentials');
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      isOrgAdmin: user.isOrgAdmin,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { 
      user, 
      tenant: user.tenant, 
      agent: user.tenant.agents?.[0] || null,
      accessToken, 
      refreshToken 
    };
  }

  static async refreshToken(oldRefreshToken: string) {
    const session = await prisma.session.findUnique({ where: { refreshToken: oldRefreshToken } });
    if (!session || session.refreshExpiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    let payload;
    try {
      payload = verifyRefreshToken(oldRefreshToken);
    } catch (e) {
      throw new Error('Invalid or expired refresh token');
    }

    const newPayload = {
      id: payload.id,
      tenantId: payload.tenantId,
      email: payload.email,
      isOrgAdmin: payload.isOrgAdmin,
    };

    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  static async logout(refreshToken: string) {
    await prisma.session.deleteMany({
      where: { refreshToken },
    });
  }

  static async googleSSO(googleUser: { googleId: string; email: string; name: string; avatar?: string }) {
    const { googleId, email, name, avatar } = googleUser;
    
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { tenant: true },
    });

    if (!user) {
      return this.register({
        name,
        email,
        tenantName: `${name}'s Workspace`,
        isGoogleSSO: true,
        googleId,
        avatar,
      });
    }

    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatar },
        include: { tenant: true },
      });
    }

    return this.login({ email });
  }

  static async getMe(userId: string, tenantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: { include: { agents: true } } },
    });
    
    if (!user) throw new Error('User not found');

    const { passwordHash, ...userWithoutPassword } = user;
    const { tenant, ...userRest } = userWithoutPassword;

    return {
      user: userRest,
      tenant,
      agent: tenant.agents?.[0] || null,
    };
  }
}
