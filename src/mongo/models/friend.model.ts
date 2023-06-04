import * as mongoose from 'mongoose';
import { Model, Schema, Types } from 'mongoose';
import { SelectedPopulateUserFields, UserModelType } from './user.model';

export interface IFriendsSchema {
  user: Types.ObjectId;
  friendsList: Array<Types.ObjectId>;
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFriendsModel<T = Types.ObjectId> {
  _id: Types.ObjectId;
  user: Omit<UserModelType, 'password'>;
  friendsList: Array<T>;
  createdAt: Date;
  updatedAt: Date;
}

interface FriendsModelForSchema extends Model<IFriendsModel> {
  findByUser(userId: Types.ObjectId): IFriendsModel;
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
