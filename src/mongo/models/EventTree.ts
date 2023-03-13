import {Schema} from "mongoose";
import * as mongoose from "mongoose";

export interface EventTreeModelType {
	userId: Schema.Types.ObjectId,
	_id: Schema.Types.ObjectId
}

const EventTree = new Schema({
	userId: {type: Schema.Types.ObjectId, required: true, ref: "User", index: true},
})

export const EventTreeModel = mongoose.model<EventTreeModelType>('EventTree', EventTree)