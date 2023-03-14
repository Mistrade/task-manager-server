import express from 'express';
import {
  getEventCounterOfStatuses,
  getEventInfoByEventId,
  getEventsScheme,
  getEventsStorage,
  getShortEventsArray,
  updateEventInfo,
} from './event-info.controller';

const router = express.Router();

// полный путь - /api/planning/events/info/

router.post('/get_short_events_array', getShortEventsArray);
router.post('/get_events_storage', getEventsStorage);
router.post('/get_events_count_of_statuses', getEventCounterOfStatuses);
router.post('/get_events_scheme', getEventsScheme);
router.post('/update', updateEventInfo);
router.get('/:eventId', getEventInfoByEventId);

export const EventInfoRouter = router;
