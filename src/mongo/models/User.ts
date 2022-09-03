import {Schema, model, Document} from "mongoose";

export interface UserModel {
	_id: Schema.Types.ObjectId,
	email?: string,
	phone: string,
	name?: string,
	surname?: string,
	patronymic?: string,
	created: Date,
	lastUpdate?: string,
	password: string
}

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

export const User = model<UserModel>('User', UserSchema)

