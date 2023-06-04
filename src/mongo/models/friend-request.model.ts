import * as mongoose from 'mongoose';
import { Schema, Types } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';
import { SelectedPopulateUserFields, TUserOmitPassword } from './user.model';

export type TFriendRequestStatuses = 'created' | 'decline' | 'accepted';

export const friendRequestStatuses: {
  [key in TFriendRequestStatuses]: TFriendRequestStatuses;
} = {
  created: 'created',
  accepted: 'accepted',
  decline: 'decline',
};

export enum FRIENDS_REQUEST_TYPES {
  'OUTGOING' = 'outgoing',
  'INCOMING' = 'incoming',
}

interface IDefaultFriendRequestFields {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFriendRequestSchema {
  fromUser: Types.ObjectId;
  toUser: Types.ObjectId;
  acceptedStatus: TFriendRequestStatuses;
}

export type TFriendRequestFullSchema = IFriendRequestSchema &
  IDefaultFriendRequestFields;

export interface IFriendRequestModel extends IDefaultFriendRequestFields {
  acceptedStatus: TFriendRequestStatuses;
  fromUser: TUserOmitPassword;
  toUser: TUserOmitPassword;
}

const FriendRequestSchema = new Schema<IFriendRequestModel>(
  {
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      autopopulate: {
        select: SelectedPopulateUserFields,
      },
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      autopopulate: {
        select: SelectedPopulateUserFields,
      },
    },
    acceptedStatus: {
      type: String,
      validate: {
        validator: function (value: keyof typeof friendRequestStatuses) {
          return !!friendRequestStatuses[value];
        },
        message:
          'Статус на заявку в друзья может быть: Создано, Принято, Отклонено',
      },
    },
  },
  {
    timestamps: true,
    statics: {
      async findIncomingRequests(
        userId: Types.ObjectId
      ): Promise<Array<IFriendRequestModel> | null> {
        return await this.find({
          acceptedStatus: 'created',
          toUser: userId,
        });
      },
      async findOutgoingRequests(
        userId: Types.ObjectId
      ): Promise<Array<IFriendRequestModel> | null> {
        return await this.find<IFriendRequestModel>({
          acceptedStatus: 'created',
          fromUser: userId,
        });
      },
    },
  }
);

FriendRequestSchema.plugin(autopopulate);

export const FriendRequestModel = mongoose.model<IFriendRequestModel>(
  'FriendRequest',
  FriendRequestSchema
);
