import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/google', (req, res) => authController.googleLogin(req, res));
router.get('/me', authMiddleware, (req, res) => authController.getMe(req, res));
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));

export default router;
