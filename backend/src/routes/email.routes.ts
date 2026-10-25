import { Router } from 'express';
import multer from 'multer';
import { emailController } from '../controllers/email.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer with in-memory storage for CSV parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// All email routes require JWT authentication
router.use(authMiddleware);

router.post('/schedule', upload.single('file'), (req, res) =>
  emailController.scheduleEmails(req, res)
);
router.get('/scheduled', (req, res) => emailController.getScheduledEmails(req, res));
router.get('/sent', (req, res) => emailController.getSentEmails(req, res));
router.get('/search', (req, res) => emailController.searchEmails(req, res));
router.get('/batches', (req, res) => emailController.getBatches(req, res));
router.get('/batches/:id', (req, res) => emailController.getBatchById(req, res));

export default router;
