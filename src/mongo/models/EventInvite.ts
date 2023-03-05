import * as mongoose from "mongoose";
import {Schema} from "mongoose";
import autopopulate from "mongoose-autopopulate";

export type EventInviteAcceptedStatuses = 'not_accepted' | 'accepted' | 'decline'
export type EventInviteAccessRights = 'viewer' | 'editor' | 'admin'
export type AccessRightsWithOwner = EventInviteAccessRights | 'owner'

export interface EventInviteQueryType {
	_id: Schema.Types.ObjectId,
	createdAt: Date, //создано
	updatedAt: Date, //обновлено
	invitedUser: Schema.Types.ObjectId, //кого пригласили к событию
	event: Schema.Types.ObjectId, //Ссылка на само событие
	whoInvited: Schema.Types.ObjectId, //кто пригласил
	accessRights: EventInviteAccessRights, //Права доступа
	acceptedStatus: EventInviteAcceptedStatuses //Статус приглашения
}

export type EventInviteCreateType = Omit<EventInviteQueryType, '_id' | 'createdAt' | 'updatedAt'>

type OmittedInviteType = Omit<EventInviteQueryType, 'invitedUser' | 'event' | 'whoInvited'>

const EventInviteSchema = new Schema({
	invitedUser: {type: Schema.Types.ObjectId, ref: "User", required: true},
	event: {type: Schema.Types.ObjectId, ref: "Event", required: true},
	whoInvited: {type: Schema.Types.ObjectId, ref: "User", required: true},
	accessRights: {type: String, default: "viewer" as AccessRightsWithOwner},
	acceptedStatus: {type: String, default: "not_accepted" as EventInviteAcceptedStatuses},
}, {timestamps: true})

EventInviteSchema.plugin(autopopulate)

export const EventInviteModel = mongoose.model<EventInviteQueryType>('EventInvite', EventInviteSchema)