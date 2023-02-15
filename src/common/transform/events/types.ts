import {
	CalendarPriorityKeys,
	EventLinkItem,
	TaskStatusesType
} from "../../../mongo/models/EventModel";
import {CalendarsModelType} from "../../../mongo/models/Calendars";
import {UserModelResponse, UtcDate} from "../session/types";
import {Schema} from "mongoose";
import {ShortUserModel} from "../../../mongo/models/User";

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
	parentId?: Schema.Types.ObjectId,
	members: Array<UserModelResponse>,
	priority: CalendarPriorityKeys,
	status: TaskStatusesType,
	time: UtcDate,
	timeEnd: UtcDate,
	title: string,
	type: string,
	userId: UserModelResponse,
	lastChange: UtcDate,
	calendar: CalendarResponse,
	isLiked: boolean,
	childOf: Array<Schema.Types.ObjectId>
}

export type ShortEventItemResponseWithoutUserId = Pick<FullResponseEventModel, 'title' | 'time' | 'timeEnd' | 'link' | 'id' | 'priority' | 'description' | 'status' | 'calendar' | 'isLiked'>
export interface ShortEventItemResponse  extends  ShortEventItemResponseWithoutUserId {
	userId: ShortUserModel
}