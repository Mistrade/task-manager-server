import express from 'express';
import { ChainsRouter } from '../chains/chains.router';
import { HistoryRouter } from '../history/event-history.router';
import { GroupsRouter } from '../groups/groups.router';
import { CommentsRouter } from '../comments/comments.router';
import { EventInfoRouter } from '../info/event-info.router';
import { EventsController } from './events.controller';

const router = express.Router();

// полный путь - /api/planning/events/

//Список путей доступный для EventsRouter
router.post('/create', EventsController.create);
router.post('/remove', EventsController.remove);
router.post('/generate', EventsController.generate);
router.post('/remove_random_events', EventsController.removeRandomEvents);

//Список расширяемых путей для EventsRouter
router.use('/info', EventInfoRouter); //+
router.use('/history', HistoryRouter); //+
router.use('/chains', ChainsRouter);
router.use('/groups', GroupsRouter); //+
router.use('/comments', CommentsRouter);

export const EventsRouter = router;
