import { Router } from 'express';
import { register, login, loginTwoFactor, refresh, logout, getProfile, verifyEmail, resendVerification, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { setup2fa, enable2fa, disable2fa } from '../controllers/twoFactor.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/login/2fa', loginTwoFactor);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/verify-email', verifyEmail);
router.post('/verify-email/resend', authMiddleware, resendVerification);
router.post('/password/forgot', forgotPassword);
router.post('/password/reset', resetPassword);
router.post('/2fa/setup', authMiddleware, setup2fa);
router.post('/2fa/enable', authMiddleware, enable2fa);
router.post('/2fa/disable', authMiddleware, disable2fa);
router.get('/profile', authMiddleware, getProfile);

export default router;
