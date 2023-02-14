import {CalendarPriorityKeys, EventLinkItem, TaskStatusesType} from "../../mongo/models/EventModel";
import {Schema} from "mongoose";

export interface UpdateTaskPriority {
	id: string,
	field: 'priority',
	data: CalendarPriorityKeys
}

export interface UpdateTaskStatus {
	id: string,
	field: 'status',
	data: TaskStatusesType
}

export interface UpdateTaskLinkItem {
	id: string,
	field: 'link',
	data: EventLinkItem
}

export interface UpdateTaskTime {
	id: string,
	field: 'time' | 'timeEnd',
	data: string
}

export interface UpdateTaskTitleOrDescription {
	id: string,
	field: 'title' | 'description',
	data: string
}

export interface UpdateTaskMembersList {
	id: string,
	field: 'members',
	data: string,
}

export interface UpdateTaskCalendar {
	id: Schema.Types.ObjectId,
	field: 'calendar',
	data: Schema.Types.ObjectId
}

export interface UpdateTaskIsLiked {
	id: Schema.Types.ObjectId,
	field: 'isLiked',
	data: boolean
}

export type UpdateTaskTypes =
	UpdateTaskPriority
	| UpdateTaskStatus
	| UpdateTaskLinkItem
	| UpdateTaskTime
	| UpdateTaskTitleOrDescription
	| UpdateTaskMembersList
	| UpdateTaskCalendar
	| UpdateTaskIsLiked


export interface UpdateTaskCreatedAt {
	id: string,
	field: 'createdAt',
	data: string
}

export type SystemUpdateTaskTypes = UpdateTaskTypes | UpdateTaskCreatedAt