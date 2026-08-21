import { Router } from 'express';
import { tenantController } from './tenant.controller';
import { authenticate, requireOrgAdmin } from '../../middleware/auth';
import { resolveTenant } from '../../middleware/tenant';

const router = Router();

// Protect all admin tenant routes with auth + tenant resolution + admin check
router.use(authenticate);
router.use(resolveTenant);
router.use(requireOrgAdmin);

router.get('/admin/overview', (req, res, next) => tenantController.getAdminOverview(req, res, next));
router.get('/admin/users', (req, res, next) => tenantController.getAdminUsers(req, res, next));
router.post('/admin/users', (req, res, next) => tenantController.createAdminUser(req, res, next));
router.patch('/admin/users/:userId', (req, res, next) => tenantController.updateUserStatus(req, res, next));
router.delete('/admin/users/:userId', (req, res, next) => tenantController.deleteAdminUser(req, res, next));
router.get('/admin/workspaces', (req, res, next) => tenantController.getAdminWorkspaces(req, res, next));
router.get('/admin/audit-logs', (req, res, next) => tenantController.getAdminAuditLogs(req, res, next));
router.get('/admin/usage', (req, res, next) => tenantController.getAdminUsage(req, res, next));

export default router;
