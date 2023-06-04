import { model, Schema, Types } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';
import { DbTaskPriorities, DbTaskStatuses } from '../../common/constants';
import { UserModelHelper } from '../helpers/user.helper';
import { EventInviteQueryType } from './event-invite.model';
import { GroupsModelType } from './groups.model';
import { UserModelType } from './user.model';

export type PriorityKeys = 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh';

export type CalendarPriorityKeys = PriorityKeys | 'not_selected';

export type TaskStatusesType =
  | 'completed'
  | 'created'
  | 'in_progress'
  | 'review'
  | 'archive';

export interface EventLinkItem {
  key: string;
  value: string;
}

export interface ICheckListItem {
  title: string;
  state: boolean;
  eventLink: Types.ObjectId | null;
  _id: Types.ObjectId;
}

export enum EVENT_WIDGET_MODEL_MAP {
  'FINANCE' = 'FinanceOperation',
}

// export interface IDbEventWidget {
//   title: string,
//   message?: string,
//   modelId: Types.ObjectId,
//   model: EVENT_WIDGET_MODEL_MAP,
//
// }

export interface DbEventModel {
  _id: Types.ObjectId;
  description: string;
  link: EventLinkItem | null;
  linkedFrom?: Types.ObjectId;
  parentId?: Types.ObjectId;
  priority: PriorityKeys;
  status: TaskStatusesType;
  time: Date;
  timeEnd: Date;
  title: string;
  type: string;
  userId: Types.ObjectId;
  group: Types.ObjectId | null;
  likedUsers: Array<Types.ObjectId>;
  createdAt: Date;
  updatedAt: Date;
  invites: Array<EventModelInvitesObject>;
  treeId: Types.ObjectId | null;
  checkList: null | Types.ObjectId;
  // widget: IDbEventWidget | null
}

export interface EventModelInvitesObject<InviteType = Types.ObjectId> {
  userId: Types.ObjectId;
  inviteId: InviteType | null;
}

export interface EventModelType
  extends Omit<DbEventModel, 'userId' | 'group' | 'invites'> {
  userId: UserModelType;
  group: GroupsModelType | null;
  invites: Array<
    EventModelInvitesObject<
      Omit<EventInviteQueryType, 'event' | 'createdAt' | 'updatedAt'>
    >
  >;
}

export interface EventModelWithPopulatedChains
  extends Omit<EventModelType, 'linkedFrom' | 'parentId'> {
  parentId: EventModelType | null;
  linkedFrom: EventModelType | null;
}

export const LinkSchema = new Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
});

export const EventSchema = new Schema(
  {
    checkList: {
      type: Schema.Types.ObjectId,
      ref: 'CheckList',
      default: null,
    },
    title: { type: String, required: true }, //+
    description: { type: String }, //+
    treeId: { type: String, default: null },
    link: { type: LinkSchema, required: false, default: null }, //+
    linkedFrom: {
      type: Schema.Types.ObjectId || undefined,
      ref: 'Event',
      default: null,
    }, //+
    parentId: {
      type: Schema.Types.ObjectId || undefined,
      ref: 'Event',
      default: null,
    }, //+
    priority: {
      type: String,
      required: true,
      default: 'medium' as PriorityKeys,
      of: DbTaskPriorities,
    },
    status: {
      type: String,
      required: true,
      default: 'created' as TaskStatusesType,
      of: DbTaskStatuses,
    },
    time: { type: Date, required: true },
    timeEnd: { type: Date, required: true },
    type: { type: String, required: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      autopopulate: {
        select: [
          'name',
          'surname',
          'phone',
          '_id',
          'email',
          'patronymic',
          'created',
        ],
      },
      required: true,
      get: (v: UserModelType) =>
        UserModelHelper.getPopulatedUserWithoutPassword(v),
    },
    invites: {
      type: [
        {
          type: {
            userId: {
              type: Schema.Types.ObjectId,
              required: true,
              ref: 'User',
            },
            inviteId: {
              type: Schema.Types.ObjectId,
              required: true,
              ref: 'EventInvite',
              autopopulate: true,
            },
          },
        },
      ],
      default: [],
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      autopopulate: true,
    },
    likedUsers: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      default: [],
    },
  },
  { timestamps: true }
);

EventSchema.plugin(autopopulate);

export const EventModel = model<EventModelType>('Event', EventSchema);
