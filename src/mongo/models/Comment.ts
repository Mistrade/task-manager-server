import {Schema} from "mongoose";
import {UserModelHelper} from "../helpers/User";
import {UserModel} from "./User";
import {utcDate} from "../../common/common";
import * as mongoose from "mongoose";
import {UserModelResponse} from "../../common/transform/session/types";

export interface CommentSchema {
	eventId: Schema.Types.ObjectId,
	userId: Schema.Types.ObjectId,
	date: Date,
	message: string
}

export interface CommentModel {
	eventId: Schema.Types.ObjectId,
	userId: UserModelResponse,
	date: Date,
	message: string
}

export const CommentSchema = new Schema({
	eventId: {type: Schema.Types.ObjectId, required: true, ref: "Event"},
	userId: {
		type: Schema.Types.ObjectId,
		required: true,
		autopopulate: true,
		ref: "User",
		get: (v: UserModel) => UserModelHelper.getPopulatedUserWithoutPassword(v)
	},
	date: {type: Date, required: true, default: () => utcDate()},
	message: {type: String, required: true, maxLength: 3000},
})

export const Comment = mongoose.model('Comment', CommentSchema)