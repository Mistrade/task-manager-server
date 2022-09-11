import {
	CalendarPriorityKeys,
	EventHistoryFields,
	EventLinkItem,
	TaskStatusesType
} from "../../../mongo/models/EventModel";
import {CalendarsModelType} from "../../../mongo/models/Calendars";
import {UserModelResponse, UtcDate} from "../session/types";
import {Schema} from "mongoose";

export interface EventHistoryResponse {
	date: UtcDate,
	field: keyof EventHistoryFields,
	description: string,
	userId: UserModelResponse,
	oldValue: string,
	newValue: string,
}

export interface CalendarResponse {
	_id: Schema.Types.ObjectId,
	userId: UserModelResponse,
	created: UtcDate,
	isSelected: boolean,
	title: string,
	editable: boolean,
	color: string,
	deletable: boolean,
	type: CalendarsModelType
}

export interface FullResponseEventModel {
	id: Schema.Types.ObjectId,
	createdAt: UtcDate,
	description: string,
	link: EventLinkItem | null,
	linkedFrom?: Schema.Types.ObjectId,
	members: Array<UserModelResponse>,
	priority: CalendarPriorityKeys,
	status: TaskStatusesType,
	time: UtcDate,
	timeEnd: UtcDate,
	title: string,
	type: string,
	userId: UserModelResponse,
	lastChange: UtcDate,
	history: Array<EventHistoryResponse>,
	calendar: CalendarResponse
}

export type ShortEventItemResponse = Pick<FullResponseEventModel, 'title' | 'time' | 'timeEnd' | 'link' | 'id' | 'priority' | 'description' | 'status' | 'calendar'>
