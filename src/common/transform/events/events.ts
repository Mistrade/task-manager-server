import {CalendarResponse, FullResponseEventModel, ShortEventItemResponse,} from "./types";
import {EventModel} from "../../../mongo/models/EventModel";
import dayjs from "dayjs";
import {SessionTransformer} from "../session/session";
import {CalendarsModel} from "../../../mongo/models/Calendars";
import {utcString} from "../../common";


interface TransformerObject {
	eventItemResponse: (this: TransformerObject, event: EventModel) => FullResponseEventModel,
	calendarItemResponse: (this: TransformerObject, data: CalendarsModel | null) => CalendarResponse | null,
	// historyItemResponse: (this: TransformerObject, data: EventHistoryItem) => EventHistoryResponse,
	shortEventItemResponse: (this: TransformerObject, data: EventModel) => ShortEventItemResponse,
	// historyItemDb: (this: TransformerObject, data: EventHistoryItem) => DbEventHistoryItem,
}


export const EventTransformer: TransformerObject = {
	eventItemResponse(event) {
		return {
			id: event._id,
			createdAt: dayjs(event.createdAt).utc().toString(),
			description: event.description,
			link: event.link,
			linkedFrom: event.linkedFrom,
			parentId: event.parentId,
			members: event.members,
			priority: event.priority,
			status: event.status,
			calendar: EventTransformer.calendarItemResponse(event.calendar),
			time: dayjs(event.time).utc().toString(),
			timeEnd: dayjs(event.timeEnd).utc().toString(),
			title: event.title,
			type: event.type,
			userId: event.userId,
			lastChange: dayjs(event.lastChange).utc().toString(),
			isLiked: event.isLiked,
			childOf: event.childOf || []
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
			calendar: EventTransformer.calendarItemResponse(data.calendar),
			isLiked: data.isLiked,
			userId: data.userId
		}
	},
}