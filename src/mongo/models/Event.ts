import {Document, model, ObjectId, Schema} from "mongoose";
import {UserModel} from "./User";
import {EventLinkItem} from "../../routes/EventsRouter/EventsRouter";

export interface EventModel {
	_id?: Schema.Types.ObjectId,
	createdAt: Date,
	description: string,
	link: EventLinkItem | null,
	linkedFrom?: ObjectId,
	members: Array<UserModel>,
	priority: string,
	status: string,
	time: Date,
	timeEnd: Date,
	title: string,
	type: string,
	userId: Schema.Types.ObjectId,
	lastChange: Date,
	history: Array<EventHistoryItem>
}

export type EventHistoryFields = Omit<EventModel, '_id' | 'linkedFrom' | 'userId' | 'lastChange' | 'history'>

export interface EventHistoryItem {
	date: Date,
	field: keyof EventHistoryFields,
	description: string,
	userId: Schema.Types.ObjectId,
	oldValue: EventModel[keyof EventHistoryFields],
	newValue: EventModel[keyof EventHistoryFields],
}

const LinkSchema = new Schema({
	key: {type: String, required: true},
	value: {type: String, required: true}
})

const EventHistoryItemSchema = new Schema({
	date: {type: Date, required: true},
	field: {type: String, required: true},
	description: {type: String, required: false, default: ''},
	userId: {type: Schema.Types.ObjectId, required: true, ref: 'User'}
})

const EventSchema = new Schema({
	createdAt: {type: Date, required: true},
	description: {type: String},
	link: {type: LinkSchema, required: false, default: null},
	linkedFrom: {type: Schema.Types.ObjectId, ref: 'Event', default: null},
	members: {type: [{type: Schema.Types.ObjectId, ref: 'User'}], default: []},
	priority: {type: String, required: true},
	status: {type: String, required: true},
	time: {type: Date, required: true},
	timeEnd: {type: Date, required: true},
	title: {type: String, required: true},
	type: {type: String, required: true},
	userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
	lastChange: {type: Date, required: true},
	history: {type: [EventHistoryItemSchema], default: []}
})

export const Event = model<EventModel>('Event', EventSchema)