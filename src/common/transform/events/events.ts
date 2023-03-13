import {CalendarResponse, FullResponseEventModel, ShortEventItemResponse,} from "./types";
import {EventModelType} from "../../../mongo/models/EventModel";
import dayjs from "dayjs";
import {SessionTransformer} from "../session/session";
import {GroupsModelType} from "../../../mongo/models/Group";
import {utcString} from "../../common";
import {EventHistoryResponseItem, PopulatedEventHistoryDb} from "../../../mongo/models/EventHistory";
import {UserModelHelper} from "../../../mongo/helpers/User";


interface TransformerObject {
	eventItemResponse: (this: TransformerObject, event: EventModelType) => FullResponseEventModel,
	calendarItemResponse: (this: TransformerObject, data: GroupsModelType | null) => CalendarResponse | null,
	// historyItemResponse: (this: TransformerObject, data: EventHistoryItem) => EventHistoryResponse,
	shortEventItemResponse: (this: TransformerObject, data: EventModelType) => ShortEventItemResponse,
	// historyItemDb: (this: TransformerObject, data: EventHistoryItem) => DbEventHistoryItem,
}


export const transformEventSnapshot = (data: PopulatedEventHistoryDb['eventSnapshot']): EventHistoryResponseItem["eventSnapshot"] => {
	return {
		id: data._id,
		parentId: data.parentId ? EventTransformer.eventItemResponse(data.parentId) : null,
		calendar: data.group ? EventTransformer.calendarItemResponse(data.group) : null,
		linkedFrom: data.linkedFrom ? EventTransformer.eventItemResponse(data.linkedFrom) : null,
		members: [],
		title: data.title,
		type: data.type,
		userId: UserModelHelper.getPopulatedUserWithoutPassword(data.userId),
		time: utcString(data.time),
		timeEnd: utcString(data.timeEnd),
		isLiked: false,
		description: data.description,
		createdAt: utcString(data.createdAt),
		updatedAt: utcString(data.updatedAt),
		status: data.status,
		link: data.link,
		priority: data.priority
	}
}

export const EventTransformer: TransformerObject = {
	eventItemResponse(event) {
		return {
			id: event._id,
			updatedAt: utcString(event.updatedAt),
			createdAt: utcString(event.createdAt),
			description: event.description,
			link: event.link,
			linkedFrom: event.linkedFrom,
			parentId: event.parentId,
			members: [],
			priority: event.priority,
			status: event.status,
			calendar: EventTransformer.calendarItemResponse(event.group),
			time: dayjs(event.time).utc().toString(),
			timeEnd: dayjs(event.timeEnd).utc().toString(),
			title: event.title,
			type: event.type,
			userId: UserModelHelper.getPopulatedUserWithoutPassword(event.userId),
			isLiked: false,
		}
	},
	calendarItemResponse(data) {
		if (!data) return null
		return {
			editable: data.editable,
			created: dayjs(data.created).utc().toString(),
			deletable: data.deletable,
			type: data.type,
			userId: SessionTransformer.userModelResponse(data.userId),
			_id: data._id,
			isSelected: data.isSelected,
			color: data.color,
			title: data.title
		}
	},
	shortEventItemResponse(data) {
		return {
			id: data._id,
			description: data.description,
			time: utcString(data.time),
			timeEnd: utcString(data.timeEnd),
			status: data.status,
			priority: data.priority,
			title: data.title,
			link: data.link,
			calendar: EventTransformer.calendarItemResponse(data.group),
			isLiked: false,
			userId: data.userId
		}
	},
}