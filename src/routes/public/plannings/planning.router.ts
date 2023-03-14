import express from 'express';
import { AuthMiddleware } from '../../../middlewares/auth.middleware';
import { EventsRouter } from './events/events.router';

const route = express.Router();

route.use(AuthMiddleware);
route.use('/events', EventsRouter);

export const PlanningRouter = route;
