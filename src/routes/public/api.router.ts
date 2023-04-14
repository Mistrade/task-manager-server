import express from 'express';
import { PlanningRouter } from './plannings/planning.router';
import { SessionRouter } from './session/session.router';
import { FriendsRouter } from './friends/friends.router';
import { AuthMiddleware } from '../../middlewares/auth.middleware';

const route = express.Router();

route.use('/session', SessionRouter);

route.use(AuthMiddleware);
route.use('/planning', PlanningRouter);
route.use('/friends', FriendsRouter);

export const ApiRouter = route;
