import express, {response} from "express";
import {connectChildrenEvent, getChainsByEventId} from "./chains-controller";
import {EventTree} from "./helpers/tree.helper";
import {EventModel, EventModelType} from "../../../mongo/models/EventModel";
import {HydratedDocument} from "mongoose";
import {ResponseException} from "../../../exceptions/ResponseException";

const router = express.Router()

// полный путь - /api/planning/events/chains/
router.post('/connect/children', connectChildrenEvent)
router.get('/:eventId', getChainsByEventId) //chains

export const ChainsRouter = router