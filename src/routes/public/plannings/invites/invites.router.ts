import express from 'express';
import { getInvitesListByEventId } from './invites.controller';

const router = express.Router();

//полный путь /api/planning/events/info/

router.get('/invites/:eventId', getInvitesListByEventId);

export const InvitesRouter = router;
