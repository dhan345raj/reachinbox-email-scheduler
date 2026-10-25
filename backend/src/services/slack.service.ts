import { WebClient } from '@slack/web-api';
import axios from 'axios';
import prisma from '../config/database';
import { config } from '../config';
import { SlackAuthStatus } from '../types';

export class SlackService {
  /**
   * Generates the Slack OAuth v2 authorization URL
   */
  getSlackAuthUrl(userId: string): string {
    const scopes = ['chat:write', 'chat:write.public', 'incoming-webhook'].join(',');
    const redirectUri = encodeURIComponent(config.slack.redirectUri);
    const state = encodeURIComponent(userId);

    return `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
  }

  /**
   * Exchanges temporary OAuth authorization code for access token and saves to User
   */
  async handleSlackCallback(code: string, userId: string): Promise<void> {
    try {
      const client = new WebClient();

      const response = await client.oauth.v2.access({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code,
        redirect_uri: config.slack.redirectUri,
      });

      if (!response.ok) {
        throw new Error(`Slack OAuth error: ${response.error}`);
      }

      const accessToken = response.access_token as string;
      const webhookUrl = response.incoming_webhook?.url || null;
      const channelId = response.incoming_webhook?.channel_id || null;
      const teamName = response.team?.name || null;

      await prisma.user.update({
        where: { id: userId },
        data: {
          slackAccessToken: accessToken,
          slackWebhookUrl: webhookUrl,
          slackChannelId: channelId,
          slackTeamName: teamName,
        },
      });

      console.log(`[SlackService] Slack connected successfully for user: ${userId}`);
    } catch (error: any) {
      console.error('[SlackService] Error exchanging Slack OAuth code:', error.message || error);
      throw new Error(`Failed to exchange Slack OAuth code: ${error.message}`);
    }
  }

  /**
   * Sends rate limit warning notification to user's Slack if connected
   */
  async sendRateLimitNotification(
    userId: string,
    senderId: string,
    senderEmail: string,
    currentCount: number,
    limit: number
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || (!user.slackAccessToken && !user.slackWebhookUrl)) {
        return;
      }

      const message = `⚠️ Rate limit reached for sender ${senderEmail}: ${currentCount}/${limit} emails sent this hour. Next emails will be delayed to the next hour window.`;

      if (user.slackAccessToken) {
        const client = new WebClient(user.slackAccessToken);
        const channel = user.slackChannelId || '#general';
        await client.chat.postMessage({
          channel,
          text: message,
        });
        console.log(`[SlackService] Rate limit notification sent to Slack (${channel}) for user: ${userId}`);
      } else if (user.slackWebhookUrl) {
        await axios.post(user.slackWebhookUrl, { text: message });
        console.log(`[SlackService] Rate limit notification sent via webhook for user: ${userId}`);
      }
    } catch (error: any) {
      console.error('[SlackService] Error sending rate limit notification:', error.message || error);
    }
  }

  /**
   * Disconnects Slack from a user profile
   */
  async disconnectSlack(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        slackAccessToken: null,
        slackWebhookUrl: null,
        slackChannelId: null,
        slackTeamName: null,
      },
    });
    console.log(`[SlackService] Disconnected Slack for user: ${userId}`);
  }

  /**
   * Checks Slack connection status for a user
   */
  async getSlackStatus(userId: string): Promise<SlackAuthStatus> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        slackAccessToken: true,
        slackTeamName: true,
        slackChannelId: true,
      },
    });

    return {
      isConnected: Boolean(user?.slackAccessToken),
      teamName: user?.slackTeamName || null,
      channelId: user?.slackChannelId || null,
    };
  }
}

export const slackService = new SlackService();
export default slackService;
