import {AddEventChildOfProps} from "../../types";
import {
	DbEventChildOfItemSchemaType,
	EventModel,
	EventModelType,
	EventModelWithPopulatedChains
} from "../../../../mongo/models/EventModel";
import {eventSnapshot, utcDate} from "../../../../common/common";
import mongoose, {HydratedDocument, Schema} from "mongoose";
import {createEventHistoryNote, EventHistory} from "../../../../mongo/models/EventHistory";
import {EventHelper} from "../../events/helpers/eventHelper";
import {CatchErrorHandler, ResponseException} from "../../../../exceptions/ResponseException";
import {UserModelResponse} from "../../../../common/transform/session/types";
import {ResponseGetChainsByEventId} from "../types";
import {ShortEventItemResponse} from "../../info/types";
import {EventInfoHelper} from "../../info/helpers/eventInfo-helper";

export class EventChainsHelper {
	public user?: UserModelResponse
	
	constructor(user?: UserModelResponse) {
		this.user = user
	}
	
	public async pushChildOf(data: AddEventChildOfProps): Promise<ResponseException<null>> {
		try {
			if (data.eventsToAdd.length < 1) {
				throw new ResponseException(
					ResponseException.createObject(400, 'warning', "Нечего добавлять")
				)
			}
			
			if (!data.taskId) {
				throw new ResponseException(
					ResponseException.createObject(400, 'error', 'Некорректный идентификатор родительского события')
				)
			}
			
			const _ = new EventHelper(this.user)
			
			const userRootsFilter = [
				{userId: _.user._id},
				{members: _.user._id}
			]
			
			const childrenUpdated: mongoose.UpdateWriteOpResult = await EventModel.updateMany({
				_id: {
					$in: data.eventsToAdd,
				},
				$or: userRootsFilter
			}, {
				parentId: data.taskId
			})
			
			if (childrenUpdated.modifiedCount === 0) {
				throw new ResponseException(
					ResponseException.createSuccessObject(null)
				)
			}
			
			//TODO
			
			// await EventHistory.create(
			// 	createEventHistoryNote({
			// 		date: utcDate(),
			// 		eventId: data.taskId,
			// 		fieldName: 'childOf',
			// 		changeUserId: _.user._id,
			// 		snapshotDescription: "Добавлены вложенные событие",
			// 		eventSnapshot: eventSnapshot(parentEventUpdated.result, utcDate())
			// 	})
			// )
			
			const childrenQueryForHistory: Array<EventModelType> | null = await EventModel.find({
				_id: {$in: data.eventsToAdd},
				$or: userRootsFilter,
				parentId: data.taskId,
			})
			
			if (!childrenQueryForHistory || childrenQueryForHistory.length < 1) {
				throw new ResponseException(
					ResponseException.createObject(500, "error", "Произошла ошибка при записи истории в дочерние события")
				)
			}
			
			const childrenHistoryItems = childrenQueryForHistory.map((item) => (
				createEventHistoryNote({
					date: utcDate(),
					eventId: item._id,
					eventSnapshot: eventSnapshot(item, utcDate()),
					changeUserId: _.user._id,
					fieldName: 'parentId',
					snapshotDescription: "Событие было вложено в родительское"
				})
			))
			
			await EventHistory.insertMany(childrenHistoryItems)
			
			return {
				status: 200,
				json: {
					data: null,
					info: {type: "success", message: "Успешно обновлено!"}
				}
			}
			
			
		} catch (e) {
			console.error('error in add childOf method: ', e)
			return CatchErrorHandler<null>(e)
		}
	}
	
	public async getChainsByEventId(eventId: Schema.Types.ObjectId): Promise<ResponseGetChainsByEventId> {
		
		EventHelper.checkEventId(eventId)
		
		const eventApi = new EventHelper(this.user)
		
		
		const event: HydratedDocument<EventModelWithPopulatedChains> = await eventApi.getEventWithCheckRoots<EventModelWithPopulatedChains>(
			{_id: eventId},
			'owner',
			[
				{path: "parentId"}, {path: "linkedFrom"}
			]
		)
			.then(r => r)
			.catch((e) => {
				const {status, json} = CatchErrorHandler(e)
				throw new ResponseException(
					status === 404
						? ResponseException.createObject(403, 'error', 'Событие не найдено или недостаточно прав доступа для просмотра связей события')
						: ResponseException.createObject(status, json.info?.type || "error", json.info?.message || "Произошла непредвиденная ошибка при проверке события")
				)
			})
		
		const obj: ResponseGetChainsByEventId = {
			linkedFrom: event.linkedFrom ? eventApi.buildShortEventResponseObject(event.linkedFrom) : null,
			parentEvent: event.parentId ? eventApi.buildShortEventResponseObject(event.parentId) : null,
			childrenEvents: []
		}
		
		try {
			const childOfList: Array<HydratedDocument<EventModelType>> | null = await eventApi.getEventList({
				parentId: event._id,
			})
			
			if (!childOfList) {
				throw new ResponseException(
					ResponseException.createObject(500, 'error', 'Ошибка при поиска дочерних событий')
				)
			}
			
			obj.childrenEvents = childOfList.map((e): ShortEventItemResponse => eventApi.buildShortEventResponseObject(e))
		} catch (e) {
			obj.childrenEvents = []
		}
		
		return obj
	}
	
}