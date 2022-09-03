import express from "express";
import {EventsRouter} from "../EventsRouter/EventsRouter";
import {SessionRouter} from "../SessionRouter/SessionRouter";

const route = express.Router()

route.use('/events', EventsRouter)
route.use('/session', SessionRouter)

export const ApiRouter = route