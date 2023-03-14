import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

export interface EventTreeModelType {
  userId: Schema.Types.ObjectId;
  _id: Schema.Types.ObjectId;
}

const EventTreeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true,
  },
});

EventTreeSchema.index({ userId: 1 });

export const EventTreeModel = mongoose.model<EventTreeModelType>(
  'EventTree',
  EventTreeSchema
);
