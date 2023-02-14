import {model, Schema} from "mongoose";
import {UserModel} from "./User";
import autopopulate from "mongoose-autopopulate";
import {CalendarsModel} from "./Calendars";

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
	history: Array<DbEventHistoryItem>,
	calendar: Schema.Types.ObjectId,
	isLiked: boolean,
	childOf: Array<Schema.Types.ObjectId>
}

export interface EventModel extends Omit<DbEventModel, 'members' | 'userId' | 'history' | 'calendar' | 'childOf'> {
	members: Array<UserModel>,
	userId: UserModel,
	history: Array<EventHistoryItem>,
	calendar: CalendarsModel,
}

export type EventHistoryFields = Omit<EventModel, '_id' | 'linkedFrom' | 'userId' | 'lastChange' | 'history'>

export interface DbEventHistoryItem {
	date: Date,
	field: keyof EventHistoryFields,
	description: string,
	userId: Schema.Types.ObjectId,
	oldValue: string,
	newValue: string
}

export interface EventHistoryItem extends Omit<DbEventHistoryItem, 'userId'> {
	userId: UserModel,
}

const LinkSchema = new Schema({
	key: {type: String, required: true},
	value: {type: String, required: true}
})

const EventHistoryItemSchema = new Schema({
	date: {type: Date, required: true},
	field: {type: String, required: true},
	description: {type: String, required: false, default: ''},
	oldValue: {type: String, default: null},
	newValue: {type: String, required: true},
	userId: {type: Schema.Types.ObjectId, required: true, ref: 'User', autopopulate: true}
})

EventHistoryItemSchema.plugin(autopopulate)

const EventSchema = new Schema({
	createdAt: {type: Date, required: true},
	description: {type: String},
	link: {type: LinkSchema, required: false, default: null},
	linkedFrom: {type: Schema.Types.ObjectId || undefined, ref: 'Event', default: null},
	parentId: {type: Schema.Types.ObjectId || undefined, ref: 'Event', default: null},
	members: {type: [{type: Schema.Types.ObjectId, ref: 'User', autopopulate: true}], default: []},
	priority: {type: String, required: true},
	status: {type: String, required: true},
	time: {type: Date, required: true},
	timeEnd: {type: Date, required: true},
	title: {type: String, required: true},
	type: {type: String, required: true},
	userId: {type: Schema.Types.ObjectId, ref: 'User', required: true, autopopulate: true},
	lastChange: {type: Date, required: true},
	history: {type: [EventHistoryItemSchema], default: []},
	calendar: {type: Schema.Types.ObjectId, ref: 'Calendar', required: true, autopopulate: true},
	isLiked: {type: Boolean, default: false, required: true},
	childOf: {
		type: [{
			type: Schema.Types.ObjectId, ref: "Event"
		}], required: false, default: []
	}
})

EventSchema.plugin(autopopulate)

export const Event = model<EventModel>('Event', EventSchema)