import {ConnectChildrenEventFn, GetChainsByEventIdFn} from "./types";
import {CatchErrorHandler, ResponseException} from "../../../exceptions/ResponseException";
import {EventChainsHelper} from "./helpers/EventChainsHelper";
import {SessionHandler} from "../../SessionRouter/SessionHandler";
import {EventModel, EventModelType} from "../../../mongo/models/EventModel";
import {EventHelper} from "../events/helpers/eventHelper";
import {HydratedDocument, Schema} from "mongoose";
import {EventTree} from "./helpers/tree.helper";

export const getChainsByEventId: GetChainsByEventIdFn = async (request, response) => {
	try {
		const {user, params} = request
		
		const chainsApi = new EventChainsHelper(user)
		
		const result = await chainsApi.getChainsByEventId(params.eventId)
		
		const {status, json} = new ResponseException(
			ResponseException.createSuccessObject(result)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.log(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}

export const connectChildrenEvent: ConnectChildrenEventFn = async (req, res) => {
	//Логика метода
	
	//Сначала - проверяй входные данные - есть они или нет
	//Если с входными данными все ок - ищу в базе родительское событие и добавляемые события (currentEvent и addedEvents соответственно)
	//Проверяю что данные пришли.
	//Фильтрую массив добавляемых событий на предмет наличия treeId, который не равен treeId родительского или его отсутствия.
	//В данном случае наличие treeId - говорит о том, что событие лежит в каком-либо дереве событий
	//Отсутствие treeId - говорит о том, что на событие нет запретов для добавления
	//Полученный массив (который содержит только события) -
	
	try {
		let {user, body} = req
		user = new SessionHandler(user).checkUser()
		
		const {eventId, eventsToAdd} = body
		
		if (!eventsToAdd || !eventsToAdd.length) {
			throw new ResponseException(
				ResponseException.createObject(400, 'warning', 'Нечего добавлять. Выберите события, для которых необходимо установить childOf связь')
			)
		}
		
		const eventApi = new EventHelper(user)
		
		const currentEvent: HydratedDocument<EventModelType> | null = await eventApi.getEventWithCheckRoots({
			_id: eventId
		}, 'owner')
		
		if (!currentEvent) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Родительское событие не найдено или вы не являетесь его владельцем')
			)
		}
		
		const addedEvents: Array<EventModelType> | null = await EventModel.find({
			_id: {$in: eventsToAdd},
			...eventApi.buildMinimalRootsFilter('owner')
		})
		
		if (!addedEvents || !addedEvents.length) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Добавляемые события не найдены или вы не являетесь их владельцем')
			)
		}
		
		const problemEventIds: { [key: string]: { _id: Schema.Types.ObjectId, description: string } } = {}
		const uniquesTreeIds: Set<Schema.Types.ObjectId> = new Set()
		
		addedEvents.forEach((item) => item.treeId && uniquesTreeIds.add(item.treeId))
		
		//Возможные кейсы:
		//1. У текущего события нет дерева и у всех добавляемых событий нет деревьев.
		//2. У текущего события есть дерево и у всех добавляемых событий нет деревьев.
		//3. У текущего события нет дерева и хотя бы одно добавляемое событие имеет дерево.
		//4. У текущего события есть дерево, и хотя бы одно добавляемое событие имеет дерево, деревья не пересекаются
		//5. У текущего события нет дерева и все добавляемые события имеют дерево.
		//6. У текущего события есть дерево, и все добавляемые события имеют дерево, деревья не пересекаются
		//7. У текущего события есть дерево, и одно или несколько добавляемых событий имеет дерево, при этом есть пересечения по деревьям между родителем и добавляемыми событиями
		
		//Решение:
		//1. Конфликтов нет. Валидация не нужна.
		// Действия:
		// * Создаю дерево.
		// * Отправляю запрос на обновление событий: [(treeId для всех), (parentId для дочерних)].
		// * Формирую записи в историю.
		
		//2. Конфликтов нет. Валидация не нужна.
		// Действия:
		// * Отправляю запрос на обновление событий: treeId и parentId для дочерних.
		// * Формирую записи в историю.
		
		
		
		// type StrongTrees = {
		// 	[key in string]: {
		// 		nodeId: string,
		// 		tree: Pick<EventTree, 'eventTree' | 'paths'> | null
		// 	}
		// }
		
		
		
		// /////////
		// if (!uniquesTreeIds.size) {
		// 	//
		// 	if(currentEvent.treeId){
		// 		const currentTreeEvents =  await eventApi.getEventList({
		// 			treeId: currentEvent.treeId,
		// 			...eventApi.buildMinimalRootsFilter('owner')
		// 		})
		//
		// 		if(!currentTreeEvents.length){
		//
		// 		}
		//
		// 		// const tree =
		// 	}
		// 	addedEvents.forEach(() => {
		//
		// 	})
		// }
		// /////////
		//
		// const allChildsEvent: Array<EventModelType> | null = await eventApi.getEventList({
		// 	treeId: {$in: Array.from(uniquesTreeIds)},
		// 	...eventApi.buildMinimalRootsFilter('owner'),
		// })
		//
		// if (!allChildsEvent || !allChildsEvent.length) {
		// 	throw new ResponseException(
		// 		ResponseException.createObject(500, 'error', 'Не удалось найти события в базе данных, попробуйте еще раз или обратитесь в поддержку')
		// 	)
		// }
		//
		// type d2 = {
		// 	[key: string]: Array<EventModelType>
		// }
		//
		// const model: d2 = {}
		//
		// allChildsEvent.forEach((item) => {
		// 	const treeId = item.treeId as Schema.Types.ObjectId
		// 	const treeIdStr = treeId.toString()
		//
		// 	if (!model[treeIdStr]) {
		// 		return model[treeIdStr] = [item]
		// 	}
		//
		// 	return model[treeIdStr].push(item)
		// })
		//
		//
		// const trees: StrongTrees = {}
		//
		// addedEvents.forEach((item) => {
		// 	const strItemId = item._id.toString()
		// 	if (item.treeId) {
		// 		const treeId = item.treeId as Schema.Types.ObjectId
		// 		const treeIdStr = treeId.toString()
		//
		// 		if(trees[treeIdStr]){
		// 			return trees[strItemId] =
		// 		}
		//
		// 		const treeApi = new EventTree(model[treeIdStr])
		//
		// 		if (treeApi.eventTree) {
		// 			return trees[strItemId] = treeApi
		// 		}
		//
		// 		return problemEventIds[strItemId] = {
		// 			_id: item._id,
		// 			description: "Не удалось проверить наличие конфликтов, добавление запрещено"
		// 		}
		// 	}
		//
		// 	return trees[strItemId] = null
		// })
		
		
	} catch (e) {
		console.log(`error in ${req.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return res.status(status).json(json)
	}
}