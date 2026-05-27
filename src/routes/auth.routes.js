import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';

const authRouter = Router();

/**
 * POST /api/auth/register
 */
authRouter.post("/register", authController.register);

/**
 * POST /api/auth/login
 */
authRouter.post("/login", authController.login);    

/** 
 * GET /api/auth/get-me
 */
authRouter.get("/get-me", authController.getMe);

/**
 * GET /api/auth/refresh-token
 */
authRouter.post("/refresh-token", authController.refreshToken);

/**
 * GET /api/auth/logout
 */
authRouter.post("/logout", authController.logout);

/**
 * GET /api/auth/logout-all
 */
authRouter.post("/logout-all", authController.logoutAll);

/**
 * GET /api/auth/verify-email
 */
authRouter.post("/verify-email", authController.verifyEmail);

export default authRouter;