import express from "express";
import {getChainsByEventId} from "./chains-controller";

const router = express.Router()

// полный путь - /api/planning/events/chains/

// router.post('/add', handlers.addEventChains) //chains
router.get('/:eventId', getChainsByEventId) //chains

export const ChainsRouter = router