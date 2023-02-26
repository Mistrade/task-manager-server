import {
	DbEventChildOfItemSchemaType,
	EventLinkItem,
	PriorityKeys,
	TaskStatusesType
} from "../../mongo/models/EventModel";
import {Schema} from "mongoose";
import {FullResponseEventModel} from "../../common/transform/events/types";

export interface UpdateTaskPriority {
	id: string,
	field: 'priority',
	data: PriorityKeys
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

export interface RequestCommentAddProps {
	message: string,
	eventId: Schema.Types.ObjectId,
	sourceCommentId?: Schema.Types.ObjectId | null
}

export interface EventChainsObject {
	parentEvent: null | FullResponseEventModel,
	childrenEvents: null | Array<DbEventChildOfItemSchemaType<FullResponseEventModel>>,
	linkedFromEvent: null | FullResponseEventModel
}

export interface AddEventChildOfProps {
	chainType: "childOf",
	taskId: Schema.Types.ObjectId,
	eventsToAdd: Array<Schema.Types.ObjectId>
}

export interface AddEventParentIdProps {
	chainType: 'parentId',
	taskId: Schema.Types.ObjectId,
	eventToAdd: Schema.Types.ObjectId
}

export type AddChainsType = AddEventChildOfProps | AddEventParentIdProps

