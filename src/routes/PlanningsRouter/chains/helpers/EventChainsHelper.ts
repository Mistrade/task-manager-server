import {AddEventChildOfProps} from "../types";
import {DbEventChildOfItemSchemaType, EventModel, EventModelType} from "../../../mongo/models/EventModel";
import {eventSnapshot, utcDate} from "../../../common/common";
import mongoose from "mongoose";
import {createEventHistoryNote, EventHistory} from "../../../mongo/models/EventHistory";
import {EventHelper} from "../events/helpers/eventHelper";
import {CatchErrorHandler, ResponseException} from "../../../exceptions/ResponseException";
import {UserModelResponse} from "../../../common/transform/session/types";

export class EventChainsHandler {
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
	
}