import * as mongoose from 'mongoose';
import { Schema, Types } from 'mongoose';

export interface EventTreeModelType {
  userId: Types.ObjectId;
  _id: Types.ObjectId;
}

const EventTreeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true,
  },
});

export const EventTreeModel = mongoose.model<EventTreeModelType>(
  'EventTree',
  EventTreeSchema
);
