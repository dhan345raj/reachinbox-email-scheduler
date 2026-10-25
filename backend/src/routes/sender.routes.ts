import { Router } from 'express';
import { senderController } from '../controllers/sender.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => senderController.getSenders(req, res));
router.post('/', (req, res) => senderController.createSender(req, res));
router.delete('/:id', (req, res) => senderController.deleteSender(req, res));

export default router;
