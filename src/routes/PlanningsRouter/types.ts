import {DbEventChildOfItemSchemaType} from "../../mongo/models/EventModel";
import {Schema} from "mongoose";
import {FullResponseEventModel} from "../../common/transform/events/types";
import {UpdateEventMapTypes} from "./info/types";


export interface UpdateTaskCreatedAt {
	id: string,
	field: 'createdAt',
	data: string
}

export type SystemUpdateTaskTypes = UpdateEventMapTypes | UpdateTaskCreatedAt

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

