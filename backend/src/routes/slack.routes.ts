import { Router } from 'express';
import { slackController } from '../controllers/slack.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// OAuth initiation: authenticated user requests OAuth link
router.get('/connect', authMiddleware, (req, res) => slackController.connect(req, res));

// OAuth callback: Slack redirects back here (unauthenticated HTTP request from Slack/browser)
router.get('/callback', (req, res) => slackController.callback(req, res));

// Slack status check: authenticated user
router.get('/status', authMiddleware, (req, res) => slackController.status(req, res));

// Slack disconnect: authenticated user
router.delete('/disconnect', authMiddleware, (req, res) => slackController.disconnect(req, res));

export default router;
