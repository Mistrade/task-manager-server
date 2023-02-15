import {Schema} from "mongoose";
import dayjs from "dayjs";
import {DbEventModel, EventModel, EventModelWithPopulateChildOf, EventSchema} from "./EventModel";
import * as mongoose from "mongoose";
import {UserModelHelper} from "../helpers/User";
import {UserModel} from "./User";
import autopopulate from "mongoose-autopopulate";
import {UserModelResponse} from "../../common/transform/session/types";
import {FullResponseEventModel} from "../../common/transform/events/types";

export interface EventHistoryDb {
	date: Date,
	fieldName: keyof DbEventModel,
	changeUserId: Schema.Types.ObjectId,
	eventId: Schema.Types.ObjectId,
	snapshotDescription: string,
	eventSnapshot: DbEventModel,
}

export interface EventHistoryPopulatedItem {
	date: Date,
	fieldName: keyof EventModel,
	changeUserId: UserModelResponse,
	eventId: Schema.Types.ObjectId,
	snapshotDescription: string,
	eventSnapshot: EventModelWithPopulateChildOf,
}

export interface EventHistoryResponseItem extends Omit<EventHistoryPopulatedItem, 'eventSnapshot'> {
	eventSnapshot: FullResponseEventModel
}

const EventHistorySchema = new Schema({
	date: {type: Date, required: true, default: () => dayjs().utc().toDate()},
	fieldName: {type: String, required: true},
	changeUserId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		autopopulate: true,
		get: (v: UserModel) => UserModelHelper.getPopulatedUserWithoutPassword(v)
	},
	eventId: {type: Schema.Types.ObjectId, required: true, ref: "Event"},
	snapshotDescription: {type: String, required: true},
	eventSnapshot: {type: EventSchema, required: true},
})

EventHistorySchema.plugin(autopopulate)

export const EventHistory = mongoose.model('EventHistory', EventHistorySchema)

export function createEventHistoryNote(data: EventHistoryDb): EventHistoryDb {
	return data
}