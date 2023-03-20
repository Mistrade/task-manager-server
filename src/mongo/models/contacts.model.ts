import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { UserModelResponse } from '../../routes/public/session/types';
import autopopulate from 'mongoose-autopopulate';

export enum ContactAcceptStatuses {
  'CREATED' = 0,
  'ACCEPTED' = 1,
  'DECLINE' = 2,
}

export function contactAcceptStatusConverter(
  status: ContactAcceptStatuses
): keyof typeof ContactAcceptStatuses {
  switch (status) {
    case ContactAcceptStatuses.ACCEPTED:
      return 'ACCEPTED';
    case ContactAcceptStatuses.CREATED:
      return 'CREATED';
    case ContactAcceptStatuses.DECLINE:
      return 'DECLINE';
  }
}

export interface IContactsSchema {
  _id: Schema.Types.ObjectId;
  requestUser: Schema.Types.ObjectId;
  responseUser: Schema.Types.ObjectId;
  acceptedStatus: ContactAcceptStatuses;
  createdAt: Date;
  updatedAt: Date;
}

export type TContactsSchemaUsers = Pick<
  IContactsSchema,
  'requestUser' | 'responseUser'
>;
export type TContactsSchemaDefault = Omit<
  IContactsSchema,
  'requestUser' | 'responseUser'
>;

export type TPopulatedContactsModel = {
  [key in keyof TContactsSchemaUsers]: UserModelResponse;
} & TContactsSchemaDefault;

const ContactsSchema = new Schema(
  {
    requestUser: {
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
    responseUser: {
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
    acceptedStatus: {
      type: Number,
      min: 0,
      max: 2,
      default: 0,
      required: true,
    },
  },
  { timestamps: true }
);

ContactsSchema.plugin(autopopulate);
ContactsSchema.index({ requestUser: 1 });
ContactsSchema.index({ responseUser: 1 });

export const ContactsModel = mongoose.model<TPopulatedContactsModel>(
  'Contact',
  ContactsSchema
);
