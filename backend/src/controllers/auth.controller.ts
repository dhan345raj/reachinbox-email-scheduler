import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {
  /**
   * Handles Google OAuth ID token verification, finds or creates user, and returns JWT
   */
  async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { credential, token } = req.body;
      const idToken = credential || token;

      if (!idToken) {
        res.status(400).json({ success: false, error: 'Google ID token credential is required' });
        return;
      }

      const profile = await authService.verifyGoogleToken(idToken);
      const user = await authService.findOrCreateUser(profile);
      const jwtToken = authService.generateJwt(user);
      const userResponse = authService.formatUserResponse(user);

      res.status(200).json({
        success: true,
        data: {
          token: jwtToken,
          user: userResponse,
        },
      });
    } catch (error: any) {
      console.error('[AuthController] googleLogin error:', error);
      res.status(401).json({ success: false, error: error.message || 'Authentication failed' });
    }
  }

  /**
   * Returns current authenticated user's profile
   */
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const userResponse = authService.formatUserResponse(req.user);
      res.status(200).json({ success: true, data: userResponse });
    } catch (error: any) {
      console.error('[AuthController] getMe error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve user profile' });
    }
  }

  /**
   * Logs out user (client invalidates token)
   */
  async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}

export const authController = new AuthController();
export default authController;
