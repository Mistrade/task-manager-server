import {DbEventChildOfItemSchemaType, EventModelType} from "../../mongo/models/EventModel";
import {Schema} from "mongoose";
import {FullResponseEventModel} from "../../common/transform/events/types";
import {UpdateEventMapTypes} from "./info/types";
import express from "express";
import {UserModelResponse} from "../../common/transform/session/types";


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

export interface AuthRequest<Data extends any = any, Params = any> extends express.Request<Params, any, Data> {
	user?: UserModelResponse
}

export type FilterTaskStatuses = 'in_work' | 'completed' | 'archive' | 'created' | 'all'
export type ErrorTypes = 'info' | 'success' | 'warning' | 'error' | 'default'

export interface CustomResponseBody<T> {
	data: T | null,
	info?: {
		message: string,
		type: ErrorTypes
	}
}

export interface ResponseReturned<T extends any = any> {
	status: number,
	json: T
}

export type EventModelFilters = Partial<{ [key in keyof EventModelType | string]: any }>