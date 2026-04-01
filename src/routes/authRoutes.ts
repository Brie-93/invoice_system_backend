// src/routes/authRoutes.ts
import { Router } from 'express';
import { login, register, changePassword } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.put('/change-password', requireAuth, changePassword);

export default router;