import express from 'express';
import { PlanningRouter } from './plannings/planning.router';
import { SessionRouter } from './session/session.router';

const route = express.Router();

route.use('/planning', PlanningRouter);
route.use('/session', SessionRouter);

export const ApiRouter = route;
