import * as mongoose from 'mongoose';
import { Schema, Types } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';

export type EventInviteAcceptedStatuses =
  | 'not_accepted'
  | 'accepted'
  | 'decline';
export type EventInviteAccessRights = 'viewer' | 'editor' | 'admin';
export type AccessRightsWithOwner = EventInviteAccessRights | 'owner';

export interface EventInviteQueryType {
  _id: Types.ObjectId;
  createdAt: Date; //создано
  updatedAt: Date; //обновлено
  invitedUser: Types.ObjectId; //кого пригласили к событию
  event: Types.ObjectId; //Ссылка на само событие
  whoInvited: Types.ObjectId; //кто пригласил
  accessRights: EventInviteAccessRights; //Права доступа
  acceptedStatus: EventInviteAcceptedStatuses; //Статус приглашения
}

const EventInviteSchema = new Schema(
  {
    invitedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    whoInvited: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accessRights: { type: String, default: 'viewer' as AccessRightsWithOwner },
    acceptedStatus: {
      type: String,
      default: 'not_accepted' as EventInviteAcceptedStatuses,
    },
  },
  { timestamps: true }
);

EventInviteSchema.plugin(autopopulate);

export const EventInviteModel = mongoose.model<EventInviteQueryType>(
  'EventInvite',
  EventInviteSchema
);
