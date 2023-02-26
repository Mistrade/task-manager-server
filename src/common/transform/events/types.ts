import {
	CalendarPriorityKeys,
	DbEventChildOfItemSchemaType,
	EventLinkItem,
	TaskStatusesType
} from "../../../mongo/models/EventModel";
import {GroupItemType} from "../../../mongo/models/Group";
import {UserModelResponse, UtcDateString} from "../session/types";
import {Schema} from "mongoose";
import {ShortUserModel} from "../../../mongo/models/User";

export interface CalendarResponse {
	_id: Schema.Types.ObjectId,
	userId: UserModelResponse,
	created: UtcDateString,
	isSelected: boolean,
	title: string,
	editable: boolean,
	color: string,
	deletable: boolean,
	type: GroupItemType
}

export interface FullResponseEventModel {
	id: Schema.Types.ObjectId,
	createdAt: UtcDateString,
	updatedAt: UtcDateString,
	description: string,
	link: EventLinkItem | null,
	linkedFrom?: Schema.Types.ObjectId,
	parentId?: Schema.Types.ObjectId,
	members: Array<UserModelResponse>,
	priority: CalendarPriorityKeys,
	status: TaskStatusesType,
	time: UtcDateString,
	timeEnd: UtcDateString,
	title: string,
	type: string,
	userId: UserModelResponse,
	calendar: CalendarResponse | null,
	isLiked: boolean,
	chainsCount?: number,
	commentsCount?: number,
	historyItemsCount?: number
}

export type ShortEventItemResponseWithoutUserId = Pick<FullResponseEventModel, 'title' | 'time' | 'timeEnd' | 'link' | 'id' | 'priority' | 'description' | 'status' | 'calendar' | 'isLiked'>

export interface ShortEventItemResponse extends ShortEventItemResponseWithoutUserId {
	userId: ShortUserModel
}