import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import * as triageController from './triage.controller'

const router = Router()

router.use(authenticate)

// Email Triage
router.get('/emails', triageController.getEmails)
router.get('/summary', triageController.getSummary)
router.post('/trigger', triageController.triggerTriage)
router.patch('/:id/acted', triageController.markActed)
router.post('/:id/draft-reply', triageController.draftReply)

export default router
