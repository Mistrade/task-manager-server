import {UserModel} from "../../../mongo/models/User";

export type UtcDate = string

export interface UserModelResponse extends Omit<UserModel, 'password' | 'lastUpdate' | 'created'> {
	lastUpdate: UtcDate,
	created: UtcDate,
}