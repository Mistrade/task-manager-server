import express from "express";
import {ChainsRouter} from "../chains";
import {HistoryRouter} from "../history";
import {GroupsRouter} from "../groups";
import {CommentsRouter} from "../comments";
import {EventInfoRouter} from "../info";
import {EventsHandler} from "./eventsHandler";
import {EventModel, EventModelType} from "../../../mongo/models/EventModel";
import {HydratedDocument} from "mongoose";
import {AuthRequest} from "../types";

const router = express.Router()

const getLevelInFamilyTree = async (initial: number, event: EventModelType): Promise<number> => {
	if (event.parentId) {
		const parentEvent: HydratedDocument<EventModelType> | null = await EventModel.findOne({
			_id: event.parentId
		})

		if (parentEvent) {
			return await getLevelInFamilyTree(initial + 1, parentEvent)
		}

		return initial
	}

	return initial
}


const testAlg = async (request: AuthRequest, response: express.Response) => {
	const start = Date.now()
	//Все события
	const events: Array<HydratedDocument<EventModelType>> | null = await EventModel.find()
	const result = []

	for await (let event of events) {
		const childrenEvents: Array<HydratedDocument<EventModelType>> | null = await EventModel.find({
			parentId: event.id
		})

		const updateObj = {
			levelInFamilyTree: await getLevelInFamilyTree(0, event),
			$push: {
				parentFor: childrenEvents
					? childrenEvents.map((item) => item._id)
					: []
			}
		}

		result.push({
			eventId: event._id,
			changes: updateObj
		})

		await EventModel.updateOne({
			_id: event._id
		}, updateObj)
	}

	console.log(JSON.stringify(result, null, '\t'))
	console.log('------------------------------------------------')
	console.log('count: ', result.length)

	const end = Date.now()
	const duration = `${end - start}ms`

	return response.status(200).json({
		list: result,
		count: result.length,
		maxLevel: Math.max(...result.map((item) => item.changes.levelInFamilyTree)),
		duration
	})
}

// полный путь - /api/planning/events/

//Список путей доступный для EventsRouter
router.post('/create', EventsHandler.create) //events
router.post('/remove', EventsHandler.remove) //events
// router.post('/resolve', testAlg)

//Список расширяемых путей для EventsRouter
router.use('/info', EventInfoRouter) //+
router.use('/history', HistoryRouter) //+
router.use('/chains', ChainsRouter)
router.use('/groups', GroupsRouter) //+
router.use('/comments', CommentsRouter)


export const EventsRouter = router