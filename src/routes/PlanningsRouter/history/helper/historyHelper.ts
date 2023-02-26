import {UserModelResponse} from "../../../../common/transform/session/types";
import {SessionHandler} from "../../../SessionRouter/SessionHandler";
import {Schema} from "mongoose";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {
	EventHistory,
	EventHistoryArrayToCreate,
	EventHistoryCreateType,
	EventHistoryEditableFieldNames,
	EventHistoryQueryResult,
	EventHistoryQuerySnapshot
} from "../../../../mongo/models/EventHistory";
import {utcDate} from "../../../../common/common";

export type AnyObject = {
	[key in string]: any
}

//Класс с набором методов, позволяющих упростить работу с EventHistory API
export class HistoryHelper {
	//Пользователь, который отправил запрос
	public user: UserModelResponse;
	
	constructor(user?: UserModelResponse) {
		//Если пользователь не пройдет проверку, будет выброшено исключение формата ResponseException
		this.user = new SessionHandler(user).checkUser()
	}
	
	//Метод принимающий объект с необязательными полями объекта history.eventSnapshot
	//Возвращает полностью заполненный объект, где будут все ключи со значениями либо null || ""
	public static sortOutSnapshot(instance: EventHistoryQuerySnapshot): Required<EventHistoryQuerySnapshot> {
		return {
			_id: instance._id,
			title: instance.title || "",
			description: instance.description || "",
			createdAt: instance.createdAt,
			user: instance.user || null,
			originalEventId: instance.originalEventId || null,
			priority: instance.priority,
			status: instance.status,
			type: instance.type || "",
			time: instance.time || null,
			timeEnd: instance.timeEnd || null,
			calendar: instance.calendar || null,
			insertChildOfEvents: instance.insertChildOfEvents || [],
			removeChildOfEvents: instance.removeChildOfEvents || [],
			parentEvent: instance.parentEvent || null,
			linkedFrom: instance.linkedFrom || null,
			insertMembers: instance.insertMembers || [],
			removeMembers: instance.removeMembers || [],
			isLiked: !!instance.isLiked,
			link: instance.link || null,
		}
	}
	
	//Метод, проверяющий наличие и корректность eventId, если он некорректный - будет выброшено исключение
	private checkEventId(eventId?: Schema.Types.ObjectId): void {
		if (!eventId) {
			throw new ResponseException(
				ResponseException.createObject(400, 'error', 'Некорректное значение параметра eventId')
			)
		}
	}
	
	//Метод, возвращающий количество записей в хранилище истории по eventId
	public async getHistoryCount(eventId: Schema.Types.ObjectId, filters?: AnyObject): Promise<{ result: number } & HistoryHelper> {
		
		this.checkEventId(eventId)
		
		const count: number = await EventHistory.count({
			eventId,
			...(filters || {})
		})
		
		return {
			...this,
			result: count || 0
		}
	}
	
	//Метод, возвращающей массив записей в истории по eventId
	public async getHistoryListByEventId(
		eventId?: Schema.Types.ObjectId,
		filters?: AnyObject
	): Promise<HistoryHelper & { result: Array<EventHistoryQueryResult> }> {
		
		this.checkEventId(eventId)
		
		const eventHistoryList: Array<EventHistoryQueryResult> | null = await EventHistory.find({
			eventId,
			...(filters || {})
		})
		
		const result: Array<EventHistoryQueryResult> = eventHistoryList?.map((note): EventHistoryQueryResult => {
			return {
				date: note.date,
				eventId: note.eventId || null,
				changeUserId: note.changeUserId,
				fieldName: note.fieldName,
				snapshotDescription: note.snapshotDescription,
				eventSnapshot: HistoryHelper.sortOutSnapshot(note.eventSnapshot)
			}
		}) || []
		
		return {
			...this,
			result
		}
	}
	
	public async addToHistory<FieldNames extends EventHistoryEditableFieldNames>(
		arr: EventHistoryArrayToCreate<FieldNames>
	): Promise<HistoryHelper> {
		if (!Array.isArray(arr) || arr.length === 0) {
			throw new ResponseException(
				ResponseException.createObject(400, 'error', 'Объектов для добавления в историю событий не получено')
			)
		}
		
		const data: Array<EventHistoryCreateType<FieldNames>> = arr.map((item) => ({
			...item,
			changeUserId: this.user._id,
			date: utcDate()
		}))
		
		const insertResult = await EventHistory.insertMany(data)
		
		console.log(insertResult)
		
		if (!insertResult) {
			throw new ResponseException(
				ResponseException.createObject(500, 'error', 'Не удалось записать изменения в хранилище истории')
			)
		}
		
		return this
	}
	
	public async removeHistoryByEventId(eventId: Schema.Types.ObjectId, additionalFilters?: AnyObject): Promise<HistoryHelper> {
		this.checkEventId(eventId)
		
		await EventHistory.remove({
			eventId,
			...additionalFilters,
		})
			.catch((reason) => {
				console.log(reason)
				throw new ResponseException(
					ResponseException.createObject(500, 'error', 'Не удалось удалить историю события')
				)
			})
		
		return this
	}
	
	
}