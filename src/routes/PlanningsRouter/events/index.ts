import express from "express";
import {ChainsRouter} from "../chains";
import {HistoryRouter} from "../history";
import {GroupsRouter} from "../groups";
import {CommentsRouter} from "../comments";
import {EventInfoRouter} from "../info";
import {EventsHandler} from "./eventsHandler";

const router = express.Router()

// полный путь - /api/planning/events/

//Список путей доступный для EventsRouter
router.post('/create', EventsHandler.create) //events
router.post('/remove', EventsHandler.remove) //events

//Список расширяемых путей для EventsRouter
router.use('/info', EventInfoRouter) //+
router.use('/history', HistoryRouter) //+
router.use('/chains', ChainsRouter)
router.use('/groups', GroupsRouter)
router.use('/comments', CommentsRouter)


export const EventsRouter = router