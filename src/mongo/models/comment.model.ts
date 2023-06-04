import * as mongoose from 'mongoose';
import { Schema, Types } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';
import { utcDate } from '../../common/common';
import { UserModelResponse } from '../../routes/public/session/types';

export interface CommentSchemaType {
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  date?: Date;
  message: string;
  sourceComment?: null | Types.ObjectId;
}

export interface CommentModelType {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: UserModelResponse;
  date: Date;
  message: string;
  sourceComment?: CommentModelType | null;
  updatedAt: Date;
  likedUsers?: Array<Types.ObjectId>;
}

export const CommentSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, required: true, ref: 'Event' },
  userId: {
    type: Schema.Types.ObjectId,
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
    ref: 'User',
  },
  updatedAt: { type: Date, default: () => utcDate(), required: true },
  sourceComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    autopopulate: true,
    default: null,
  },
  date: { type: Date, required: true, default: () => utcDate() },
  message: { type: String, required: true, maxLength: 3000 },
  likedUsers: {
    type: [{ type: Schema.Types.ObjectId, required: true, ref: 'User' }],
    default: [],
  },
});

CommentSchema.plugin(autopopulate);

export const CommentModel = mongoose.model<CommentModelType>(
  'Comment',
  CommentSchema
);
