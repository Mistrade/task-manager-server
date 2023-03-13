import {model, Schema} from "mongoose";
import {UserModelHelper} from "../helpers/User";
import {UserModelResponse} from "../../common/transform/session/types";

export interface UserModel {
	_id: Schema.Types.ObjectId,
	email?: string,
	phone: string,
	name?: string,
	surname?: string,
	patronymic?: string,
	created: Date,
	lastUpdate?: Date,
	password: string
}

export type ShortUserModel = Pick<UserModelResponse, 'name' | 'surname' | '_id'>

const UserSchema = new Schema({
	email: {type: String, required: false},
	phone: {type: String, required: true, unique: true},
	name: {type: String, required: true},
	surname: {type: String, required: true},
	patronymic: {type: String, required: false},
	created: {type: Date, required: true},
	lastUpdate: {type: Date, required: true},
	password: {type: String, required: true}
})

export const UserPopulatedWithoutPass = {
	type: Schema.Types.ObjectId,
	ref: 'User',
	autopopulate: true,
	get: UserModelHelper.getPopulatedUserWithoutPassword
}
export const UserPopulatedRequired = {
	type: Schema.Types.ObjectId,
	ref: 'User',
	required: true,
	autopopulate: true,
	get: UserModelHelper.getPopulatedUserWithoutPassword
}

export const User = model<UserModel>('User', UserSchema)

