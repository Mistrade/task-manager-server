import {model, Schema} from "mongoose";
import {User, UserModel} from "./User";
import autopopulate from "mongoose-autopopulate";
import {GroupsModelType} from "./Group";
import {UserModelHelper} from "../helpers/User";
import {UserModelResponse} from "../../common/transform/session/types";
import {DbTaskPriorities, DbTaskStatuses} from "../../common/constants";
import {EventInviteQueryType} from "./EventInvite";

export type PriorityKeys = 'veryLow'
	| 'low'
	| 'medium'
	| 'high'
	| 'veryHigh'

export type CalendarPriorityKeys = PriorityKeys | 'not_selected'

export type TaskStatusesType = 'completed' | 'created' | 'in_progress' | 'review' | 'archive'

export interface EventLinkItem {
	key: string,
	value: string
}

export interface DbEventChildOfItemSchemaType<T = Schema.Types.ObjectId> {
	event: T,
	_id: Schema.Types.ObjectId,
	createdAt: Date,
}

export interface DbEventModel {
	_id: Schema.Types.ObjectId,
	description: string,
	link: EventLinkItem | null,
	linkedFrom?: Schema.Types.ObjectId,
	parentId?: Schema.Types.ObjectId
	priority: PriorityKeys,
	status: TaskStatusesType,
	time: Date,
	timeEnd: Date,
	title: string,
	type: string,
	userId: Schema.Types.ObjectId,
	group: Schema.Types.ObjectId | null,
	likedUsers: Array<Schema.Types.ObjectId>,
	createdAt: Date,
	updatedAt: Date,
	invites: Array<EventModelInvitesObject>
}

export interface EventModelInvitesObject<InviteType = Schema.Types.ObjectId> {
	userId: Schema.Types.ObjectId,
	inviteId: InviteType | null
}

export interface EventModelType extends Omit<DbEventModel, 'userId' | 'group' | 'invites'> {
	userId: UserModel,
	group: GroupsModelType | null,
	invites: Array<EventModelInvitesObject<Omit<EventInviteQueryType, 'event' | 'createdAt' | 'updatedAt'>>>
}

export interface EventModelWithPopulatedChains extends Omit<EventModelType, 'linkedFrom' | 'parentId'> {
	parentId: EventModelType | null,
	linkedFrom: EventModelType | null
}

export const LinkSchema = new Schema({
	key: {type: String, required: true},
	value: {type: String, required: true}
})

export const EventSchema = new Schema({
	title: {type: String, required: true}, //+
	description: {type: String}, //+
	link: {type: LinkSchema, required: false, default: null}, //+
	linkedFrom: {type: Schema.Types.ObjectId || undefined, ref: 'Event', default: null}, //+
	parentId: {type: Schema.Types.ObjectId || undefined, ref: 'Event', default: null}, //+
	priority: {type: String, required: true, default: "medium" as PriorityKeys, of: DbTaskPriorities},
	status: {type: String, required: true, default: 'created' as TaskStatusesType, of: DbTaskStatuses},
	time: {type: Date, required: true},
	timeEnd: {type: Date, required: true},
	type: {type: String, required: true},
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		autopopulate: true,
		required: true,
		get: (v: UserModel) => UserModelHelper.getPopulatedUserWithoutPassword(v)
	},
	invites: {
		type: [{
			type: {
				userId: {type: Schema.Types.ObjectId, required: true, ref: "User"},
				inviteId: {
					type: Schema.Types.ObjectId,
					required: true,
					ref: "EventInvite",
					autopopulate: true
				},
			},
		}],
		default: []
	},
	group: {type: Schema.Types.ObjectId, ref: 'Group', required: true, autopopulate: true},
	likedUsers: {
		type: [{type: Schema.Types.ObjectId, ref: "User", required: true}],
		default: []
	},
}, {timestamps: true})


EventSchema.plugin(autopopulate)

export const EventModel = model<EventModelType>('Event', EventSchema)