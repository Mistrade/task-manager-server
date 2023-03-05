import * as mongoose from "mongoose";
import {Schema} from "mongoose";
import {UserModelHelper} from "../helpers/User";
import {UserModel} from "./User";
import {utcDate} from "../../common/common";
import {UserModelResponse} from "../../common/transform/session/types";
import autopopulate from "mongoose-autopopulate";

export interface CommentSchemaType {
	eventId: Schema.Types.ObjectId,
	userId: Schema.Types.ObjectId,
	date?: Date,
	message: string,
	sourceComment?: null | Schema.Types.ObjectId
}

export interface CommentModel {
	_id: Schema.Types.ObjectId,
	eventId: Schema.Types.ObjectId,
	userId: UserModelResponse,
	date: Date,
	message: string,
	sourceComment?: CommentModel | null
}

export const CommentSchema = new Schema({
	eventId: {type: Schema.Types.ObjectId, required: true, ref: "Event"},
	userId: {
		type: Schema.Types.ObjectId,
		required: true,
		autopopulate: {
			select: ['name', 'surname', 'phone', '_id', 'email', 'patronymic', 'created']
		},
		ref: "User",
	},
	sourceComment: {type: Schema.Types.ObjectId, ref: "Comment", autopopulate: true, default: null},
	date: {type: Date, required: true, default: () => utcDate()},
	message: {type: String, required: true, maxLength: 3000},
})

CommentSchema.plugin(autopopulate)

export const Comment = mongoose.model<CommentModel>('Comment', CommentSchema)