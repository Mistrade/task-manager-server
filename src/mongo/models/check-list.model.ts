import { model, Schema, Types } from 'mongoose';

export interface ICheckListItemSchema {
  title: string;
  state: boolean;
  eventLink?: Types.ObjectId | null;
  responsibleUser?: Types.ObjectId | null;
  timeLimit?: Date | null;
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICheckListSchema {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  eventId: Types.ObjectId;
  data: Array<ICheckListItemSchema>;
}

const CheckListItemSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    state: Boolean,
    eventLink: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },
    responsibleUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    limeLimit: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const CheckListSchema = new Schema(
  {
    title: String,
    eventId: { type: Schema.Types.ObjectId, required: true, ref: 'Event' },
    data: {
      type: [CheckListItemSchema],
      default: null,
    },
  },
  { timestamps: true }
);

export const CheckListModel = model<ICheckListSchema>(
  'CheckList',
  CheckListSchema
);
