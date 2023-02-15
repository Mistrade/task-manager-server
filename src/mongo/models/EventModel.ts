import {model, Schema} from "mongoose";
import {User, UserModel} from "./User";
import autopopulate from "mongoose-autopopulate";
import {CalendarsModel} from "./Calendars";
import {UserModelHelper} from "../helpers/User";
import {UserModelResponse} from "../../common/transform/session/types";

export type CalendarPriorityKeys =
	'veryLow'
	| 'low'
	| 'medium'
	| 'high'
	| 'veryHigh'
	| 'not_selected'

export type TaskStatusesType = 'completed' | 'created' | 'in_progress' | 'review' | 'archive'

export interface EventLinkItem {
	key: string,
	value: string
}

export interface DbEventModel {
	_id: Schema.Types.ObjectId,
	createdAt: Date,
	description: string,
	link: EventLinkItem | null,
	linkedFrom?: Schema.Types.ObjectId,
	parentId?: Schema.Types.ObjectId
	members: Array<Schema.Types.ObjectId>,
	priority: CalendarPriorityKeys,
	status: TaskStatusesType,
	time: Date,
	timeEnd: Date,
	title: string,
	type: string,
	userId: Schema.Types.ObjectId,
	lastChange: Date,
	calendar: Schema.Types.ObjectId,
	isLiked: boolean,
	childOf: Array<Schema.Types.ObjectId>
}

export interface EventModel extends Omit<DbEventModel, 'members' | 'userId' | 'calendar'> {
	members: Array<UserModelResponse>,
	userId: UserModelResponse,
	calendar: CalendarsModel,
}

export interface EventModelWithPopulateChildOf extends Omit<EventModel, 'childOf'> {
	childOf: Array<EventModel>
}

const LinkSchema = new Schema({
	key: {type: String, required: true},
	value: {type: String, required: true}
})

export const EventSchema = new Schema({
	createdAt: {type: Date, required: true},
	description: {type: String},
	link: {type: LinkSchema, required: false, default: null},
	linkedFrom: {type: Schema.Types.ObjectId || undefined, ref: 'Event', default: null},
	parentId: {type: Schema.Types.ObjectId || undefined, ref: 'Event', default: null},
	members: {type: [{
			type: Schema.Types.ObjectId,
			ref: 'User',
			autopopulate: true,
			get: (v: UserModel) => UserModelHelper.getPopulatedUserWithoutPassword(v)
		}], default: []},
	priority: {type: String, required: true},
	status: {type: String, required: true},
	time: {type: Date, required: true},
	timeEnd: {type: Date, required: true},
	title: {type: String, required: true},
	type: {type: String, required: true},
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		autopopulate: true,
		required: true,
		get: (v: UserModel) => UserModelHelper.getPopulatedUserWithoutPassword(v)
	},
	lastChange: {type: Date, required: true},
	calendar: {type: Schema.Types.ObjectId, ref: 'Calendar', required: true, autopopulate: true},
	isLiked: {type: Boolean, default: false, required: true},
	childOf: {
		type: [{
			type: Schema.Types.ObjectId, ref: "Event"
		}],
		required: false,
		default: []
	}
})

EventSchema.plugin(autopopulate)

export const Event = model<EventModel>('Event', EventSchema)