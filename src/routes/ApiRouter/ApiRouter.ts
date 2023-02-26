import express from "express";
import {PlanningRouter} from "../PlanningsRouter";
import {SessionRouter} from "../SessionRouter/SessionRouter";

const route = express.Router()

route.use('/planning', PlanningRouter)
route.use('/session', SessionRouter)

export const ApiRouter = route