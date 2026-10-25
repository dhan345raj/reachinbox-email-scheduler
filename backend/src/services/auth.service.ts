import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { config } from '../config';
import prisma from '../config/database';
import { GoogleProfile, JWTPayload, UserWithoutSecrets } from '../types';

const googleClient = new OAuth2Client(config.google.clientId);

export class AuthService {
  /**
   * Verifies Google ID token and extracts profile data
   */
  async verifyGoogleToken(credential: string): Promise<GoogleProfile> {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.google.clientId || undefined,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new Error('Google token is missing required profile claims');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture,
      };
    } catch (error: any) {
      console.error('[AuthService] Google token verification failed:', error.message);
      throw new Error(`Invalid Google token: ${error.message}`);
    }
  }

  /**
   * Finds existing user by googleId or email, or creates a new user
   */
  async findOrCreateUser(profile: GoogleProfile): Promise<User> {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: profile.googleId },
          { email: profile.email },
        ],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.googleId,
          name: profile.name || user.name,
          avatar: profile.avatar || user.avatar,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar || null,
        },
      });
    }

    return user;
  }

  /**
   * Generates JWT token for authenticated user
   */
  generateJwt(user: { id: string; email: string; name: string }): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Formats user object for public API response (omits sensitive tokens)
   */
  formatUserResponse(user: User): UserWithoutSecrets {
    const { slackAccessToken, ...rest } = user;
    return {
      ...rest,
      hasSlackConnected: Boolean(slackAccessToken),
    };
  }
}

export const authService = new AuthService();
export default authService;
