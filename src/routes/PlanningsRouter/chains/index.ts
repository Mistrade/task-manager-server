import express, {response} from "express";
import {getChainsByEventId} from "./chains-controller";
import {EventTree} from "./helpers/tree.helper";
import {EventModel, EventModelType} from "../../../mongo/models/EventModel";
import {HydratedDocument} from "mongoose";
import {ResponseException} from "../../../exceptions/ResponseException";

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
router.get('/get_tree', async (req, res, next) => {
	const events: Array<HydratedDocument<EventModelType>> | null = await EventModel.find({
		treeId: '123'
	})
	
	if (!events || !events.length) {
		throw new ResponseException(
			ResponseException.createObject(500, 'error', 'Иди нахуй')
		)
	}
	
	const tree = new EventTree(events)
	
	return res
		.status(200)
		.json({
			tree: tree.eventTree,
			path: tree.eventTree
				? tree.returnNodePathById("63fc93505d2b2d4548c1f0df", tree.eventTree).map((node) => node._id)
				: ['Хуй тебе']
		})
})
router.get('/:eventId', getChainsByEventId) //chains

export const ChainsRouter = router