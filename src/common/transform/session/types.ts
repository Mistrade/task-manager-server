import {UserModel} from "../../../mongo/models/User";

export type UtcDateString = string
export type UtcDate = Date

export interface UserModelResponse extends Omit<UserModel, 'password' | 'lastUpdate' | 'created'> {
	lastUpdate: UtcDateString,
	created: UtcDateString,
}