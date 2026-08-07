import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authRateLimit } from '../../middleware/rateLimit';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/register', authRateLimit, AuthController.register);
router.post('/login', authRateLimit, AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.get('/google', AuthController.google);
router.get('/google/callback', AuthController.googleCallback);

export default router;
