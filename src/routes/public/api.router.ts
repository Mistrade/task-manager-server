import express from 'express';
import { AuthMiddleware } from '../../middlewares/auth.middleware';
import { FinanceRouter } from './finance';
import { FriendsRouter } from './friends/friends.router';
import { PlanningRouter } from './plannings/planning.router';
import { SessionRouter } from './session/session.router';

const route = express.Router();

route.use('/session', SessionRouter);

route.use(AuthMiddleware);
route.use('/planning', PlanningRouter);
route.use('/friends', FriendsRouter);
route.use('/finance', FinanceRouter);

export const ApiRouter = route;
