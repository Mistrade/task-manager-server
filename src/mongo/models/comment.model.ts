import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { utcDate } from '../../common/common';
import autopopulate from 'mongoose-autopopulate';
import { UserModelResponse } from '../../routes/public/session/types';

export interface CommentSchemaType {
  eventId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  date?: Date;
  message: string;
  sourceComment?: null | Schema.Types.ObjectId;
}

export interface CommentModelType {
  _id: Schema.Types.ObjectId;
  eventId: Schema.Types.ObjectId;
  userId: UserModelResponse;
  date: Date;
  message: string;
  sourceComment?: CommentModelType | null;
  updatedAt: Date;
  likedUsers?: Array<Schema.Types.ObjectId>;
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
CommentSchema.index({ userId: 1 });
CommentSchema.index({ eventId: 1 });

export const CommentModel = mongoose.model<CommentModelType>(
  'Comment',
  CommentSchema
);
