import {UserModelResponse} from "../../../../common/transform/session/types";
import {SessionHandler} from "../../../SessionRouter/SessionHandler";
import {Schema} from "mongoose";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {
	CreateSnapshotDefaultFields,
	EventHistory,
	EventHistoryArrayToCreate,
	EventHistoryCreateType,
	EventHistoryEditableFieldNames,
	EventHistoryQueryResult,
	EventHistoryQuerySnapshot, EventHistoryRequiredFields, EventHistorySnapshot, EventSnapshotCreateOptionalType
} from "../../../../mongo/models/EventHistory";
import {utcDate} from "../../../../common/common";
import {EventHelper} from "../../events/helpers/eventHelper";
import {EventModelType} from "../../../../mongo/models/EventModel";
import {HistoryDescription} from "../../../../common/constants";
import {BuildHistoryItemOptions} from "../types";

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
			group: instance.group || null,
			insertChildOfEvents: instance.insertChildOfEvents || [],
			removeChildOfEvents: instance.removeChildOfEvents || [],
			parentEvent: instance.parentEvent || null,
			linkedFrom: instance.linkedFrom || null,
			sendInvites: instance.sendInvites || [], //TODO Доработать отдачу юзера, возвращается пароль
			closeInvites: instance.closeInvites || [],
			isLiked: !!instance.isLiked,
			link: instance.link || null,
		}
	}
	
	//Метод, возвращающий количество записей в хранилище истории по eventId
	public async getHistoryCount(eventId: Schema.Types.ObjectId, filters?: AnyObject): Promise<{ result: number } & HistoryHelper> {
		
		EventHelper.checkEventId(eventId)
		
		const count: number = await EventHistory.count({
			eventId,
			...(filters || {})
		})
		
		return {
			...this,
			result: count || 0
		}
	}
	
	public buildResultHistoryItem(item: EventHistoryQueryResult): EventHistoryQueryResult {
		return {
			date: item.date,
			eventId: item.eventId || null,
			changeUserId: item.changeUserId,
			fieldName: item.fieldName,
			snapshotDescription: item.snapshotDescription,
			eventSnapshot: HistoryHelper.sortOutSnapshot(item.eventSnapshot),
			isPrivate: item.isPrivate
		}
	}
	
	//Метод, возвращающей массив записей в истории по eventId
	public async getHistoryListByEventId(
		eventId: Schema.Types.ObjectId,
		filters?: AnyObject
	): Promise<Array<EventHistoryQueryResult>> {
		
		EventHelper.checkEventId(eventId)
		
		const eventApi = new EventHelper(this.user)
		const event = await eventApi.getEvent({
			_id: eventId
		})
		
		await eventApi.checkUserRootsInEvent(
			event,
			'editor',
			'none',
			'Недостаточно прав доступа для просмотра истории этого события'
		)
		
		const eventHistoryList: Array<EventHistoryQueryResult> | null = await EventHistory.find({
			eventId,
			$or: [
				{isPrivate: true, changeUserId: this.user._id},
				{isPrivate: false}
			],
			...(filters || {})
		})
		
		return eventHistoryList?.map(this.buildResultHistoryItem) || []
	}
	
	public async addToHistory<FieldNames extends EventHistoryEditableFieldNames>(
		arr: EventHistoryArrayToCreate<FieldNames>
	): Promise<HistoryHelper> {
		if (!Array.isArray(arr)) {
			throw new ResponseException(
				ResponseException.createObject(400, 'error', 'Объектов для добавления в историю событий не получено')
			)
		}
		
		if (arr.length === 0) return this
		
		const data: Array<EventHistoryCreateType<FieldNames>> = arr.map((item) => ({
			...item,
			changeUserId: this.user._id,
			date: utcDate()
		}))
		
		try {
			await EventHistory.insertMany(data)
		} catch (e) {
			throw new ResponseException(
				ResponseException.createObject(500, 'error', 'Не удалось записать изменения в хранилище истории')
			)
		}
		
		return this
	}
	
	public async removeHistoryByEventId(events: Schema.Types.ObjectId | Array<Schema.Types.ObjectId>, additionalFilters?: AnyObject): Promise<HistoryHelper> {
		const filters: AnyObject = {}
		
		if (Array.isArray(events)) {
			events = events.filter((eventId) => !!eventId)
			filters.eventId = {
				$in: events
			}
		} else {
			EventHelper.checkEventId(events)
			filters.eventId = events
		}
		
		await EventHistory.deleteMany({
			...filters,
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
	
	public getSnapshotRequiredFields(event: EventModelType): EventHistoryRequiredFields {
		return {
			priority: event.priority,
			status: event.status,
			title: event.title,
			originalEventId: event._id,
			createdAt: utcDate(),
			user: this.user._id
		}
	}
	
	public getSnapshotOptionalFields(): Required<EventSnapshotCreateOptionalType> {
		return {
			group: null,
			description: "",
			time: null,
			timeEnd: null,
			sendInvites: [],
			insertChildOfEvents: [],
			closeInvites: [],
			removeChildOfEvents: [],
			parentEvent: null,
			linkedFrom: null,
			link: null,
			isLiked: null,
			type: null,
		}
	}
	
	public buildHistoryItem<FieldName extends EventHistoryEditableFieldNames>(
		fieldName: FieldName,
		event: EventModelType,
		data: Required<Pick<EventHistorySnapshot<FieldName>, FieldName>>,
		options?: BuildHistoryItemOptions
	): EventHistoryCreateType<EventHistoryEditableFieldNames> {
		return {
			date: utcDate(),
			changeUserId: this.user._id,
			eventId: event._id,
			fieldName,
			snapshotDescription: options?.customDescription || HistoryDescription[fieldName],
			eventSnapshot: {
				...this.getSnapshotRequiredFields(event),
				...this.getSnapshotOptionalFields(),
				...data
			},
			isPrivate: options?.isPrivate || false
		}
	}
}