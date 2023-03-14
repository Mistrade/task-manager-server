import { model, Schema } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';
import { UserModelType } from './user.model';
import dayjs from 'dayjs';
import { UserModelResponse } from '../../routes/public/session/types';

export type GroupUniqueTypes = 'Invite' | 'Main';
export type GroupItemType = 'Custom' | GroupUniqueTypes;

export interface GroupsModelType<
  T extends
    | UserModelType
    | UserModelResponse
    | Schema.Types.ObjectId = UserModelType
> {
  _id: Schema.Types.ObjectId;
  userId: T;
  created: Date;
  isSelected: boolean;
  title: string;
  editable: boolean;
  color: string;
  deletable: boolean;
  type: GroupItemType;
}

export type GroupsModelResponse = GroupsModelType<UserModelResponse>;

const GroupsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  },
  created: { type: Date, default: () => dayjs().utc().toDate() },
  isSelected: { type: Boolean, required: true, default: true },
  title: { type: String, required: true },
  editable: { type: Boolean, required: true, default: false },
  color: { type: String, required: true },
  deletable: { type: Boolean, required: true, default: false },
  type: {
    type: String,
    default: 'Custom',
    required: true,
    of: ['Invite', 'Custom', 'Main'],
  },
});

GroupsSchema.plugin(autopopulate);

export const GroupModel = model<GroupsModelType>('Group', GroupsSchema);
