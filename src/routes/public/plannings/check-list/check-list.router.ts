import express from 'express';
import {
  checkListUpdateHandler,
  createCheckListHandler,
  getCheckListByEventIdHandler,
} from './check-list.controller';

const router = express.Router();

// полный путь - /api/planning/events/

router.post('/check_list', createCheckListHandler);
router.get('/check_list/:eventId', getCheckListByEventIdHandler);
router.post('/check_list/update', checkListUpdateHandler);
router.delete('/check_list');

export const CheckListRouter = router;
