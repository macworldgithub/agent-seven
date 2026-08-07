import { Router } from 'express';
import { WorkspaceController } from './workspace.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// OAuth Callbacks (unprotected - must match GOOGLE_REDIRECT_URI / SLACK_REDIRECT_URI in .env)
router.get('/oauth/google/callback', WorkspaceController.handleGoogleCallback);
router.get('/oauth/slack/callback', WorkspaceController.handleSlackCallback);

// Apply authentication to all following routes
router.use(authenticate);

// OAuth Initiation
router.get('/oauth/google/auth-url', WorkspaceController.initiateGoogleOAuth);
router.get('/oauth/slack/auth-url', WorkspaceController.initiateSlackOAuth);

// Workspace Management
router.get('/', WorkspaceController.getWorkspaces);
router.get('/:id', WorkspaceController.getWorkspaceById);
router.patch('/:id/permissions', WorkspaceController.updatePermissions);
router.delete('/:id', WorkspaceController.revokeWorkspace);
router.post('/:id/reconnect', WorkspaceController.reconnectWorkspace);
router.post('/:id/test', WorkspaceController.testConnection);
router.patch('/:id/default', WorkspaceController.setDefaultWorkspace);
router.patch('/:id/rename', WorkspaceController.renameWorkspace);

export default router;
