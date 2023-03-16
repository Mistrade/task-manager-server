import express from 'express';
import { PlanningRouter } from './plannings/planning.router';
import { SessionRouter } from './session/session.router';
import { ContactsRouter } from './contacts/contacts.router';
import { AuthMiddleware } from '../../middlewares/auth.middleware';

const route = express.Router();

route.use('/session', SessionRouter);

route.use(AuthMiddleware);
route.use('/planning', PlanningRouter);
route.use('/contacts', ContactsRouter);

export const ApiRouter = route;
