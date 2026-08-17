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

// Watchlist
router.get('/watchlist', triageController.getWatchlist)
router.post('/watchlist', triageController.addWatchlist)
router.patch('/watchlist/:id', triageController.updateWatchlist)
router.delete('/watchlist/:id', triageController.deleteWatchlist)
router.patch('/watchlist/:id/toggle', triageController.toggleWatchlist)

// Watchlist Matches/Alerts
router.get('/alerts', triageController.getAlerts)
router.get('/alerts/count', triageController.getAlertsCount)
router.patch('/alerts/read-all', triageController.readAllAlerts)
router.patch('/alerts/:id/read', triageController.readAlert)

export default router
