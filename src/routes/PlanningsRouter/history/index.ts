import express from "express";
import {getHistoryListByEventId} from "./history-contoller";

const router = express.Router()

// полный путь - /api/planning/events/history/

router.get('/:eventId', getHistoryListByEventId) //history

export const HistoryRouter = router