import express from "express";
import {getChainsByEventId} from "./chains-controller";

const router = express.Router()

// полный путь - /api/planning/events/chains/

// router.post('/add', handlers.addEventChains) //chains
// router.get('/test/:objectId', async (req: AuthRequest, res, next) => {
// 	const {user} = req
//
// 	if (!user) {
// 		return res.status(500).json(null)
// 	}
//
// 	const a = await EventModel.find()
//
// 	for await (let doc of a){
//
// 	}
//
//
//
// 	return res.status(200).json({a})
// })
router.get('/:eventId', getChainsByEventId) //chains

export const ChainsRouter = router