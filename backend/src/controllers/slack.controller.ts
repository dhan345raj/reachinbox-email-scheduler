import { Request, Response } from 'express';
import { slackService } from '../services/slack.service';
import { config } from '../config';

export class SlackController {
  /**
   * Generates or redirects to Slack OAuth authorization URL
   */
  async connect(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const url = slackService.getSlackAuthUrl(req.user.id);

      if (req.query.redirect === 'true' || req.headers.accept?.includes('text/html')) {
        res.redirect(url);
      } else {
        res.status(200).json({ success: true, data: { url } });
      }
    } catch (error: any) {
      console.error('[SlackController] connect error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate Slack authorization URL' });
    }
  }

  /**
   * Handles OAuth callback from Slack, exchanges code for token, and redirects to frontend
   */
  async callback(req: Request, res: Response): Promise<void> {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('[SlackController] Slack returned OAuth error:', error);
        res.redirect(`${config.frontendUrl}?slack=error&message=${encodeURIComponent(String(error))}`);
        return;
      }

      if (!code || !state) {
        res.redirect(`${config.frontendUrl}?slack=error&message=missing_code_or_state`);
        return;
      }

      const userId = String(state);
      await slackService.handleSlackCallback(String(code), userId);

      res.redirect(`${config.frontendUrl}?slack=connected`);
    } catch (error: any) {
      console.error('[SlackController] callback error:', error);
      res.redirect(
        `${config.frontendUrl}?slack=error&message=${encodeURIComponent(error.message || 'unknown_error')}`
      );
    }
  }

  /**
   * Disconnects user's Slack account
   */
  async disconnect(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      await slackService.disconnectSlack(req.user.id);
      res.status(200).json({ success: true, message: 'Slack disconnected successfully' });
    } catch (error: any) {
      console.error('[SlackController] disconnect error:', error);
      res.status(500).json({ success: false, error: 'Failed to disconnect Slack' });
    }
  }

  /**
   * Returns current Slack connection status
   */
  async status(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      const status = await slackService.getSlackStatus(req.user.id);
      res.status(200).json({ success: true, data: { connected: status.isConnected, teamName: status.teamName } });
    } catch (error: any) {
      console.error('[SlackController] status error:', error);
      res.status(500).json({ success: false, error: 'Failed to get Slack status' });
    }
  }
}

export const slackController = new SlackController();
export default slackController;
