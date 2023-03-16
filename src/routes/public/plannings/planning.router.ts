import express from 'express';
import { EventsRouter } from './events/events.router';

const route = express.Router();

route.use('/events', EventsRouter);

export const PlanningRouter = route;
