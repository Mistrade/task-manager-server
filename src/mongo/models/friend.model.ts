import * as mongoose from 'mongoose';
import { Model, Schema } from 'mongoose';
import { SelectedPopulateUserFields, UserModelType } from './user.model';

export interface IFriendsSchema {
  user: Schema.Types.ObjectId;
  friendsList: Array<Schema.Types.ObjectId>;
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFriendsModel<T = Schema.Types.ObjectId> {
  _id: Schema.Types.ObjectId;
  user: Omit<UserModelType, 'password'>;
  friendsList: Array<T>;
  createdAt: Date;
  updatedAt: Date;
}

interface FriendsModelForSchema extends Model<IFriendsModel> {
  findByUser(userId: Schema.Types.ObjectId): IFriendsModel;
}

const FriendSchema = new Schema<IFriendsModel, FriendsModelForSchema>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      autopopulate: {
        select: SelectedPopulateUserFields,
      },
    },
    friendsList: {
      type: [
        {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'User',
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const FriendModel = mongoose.model<IFriendsModel, FriendsModelForSchema>(
  'Friend',
  FriendSchema
);
