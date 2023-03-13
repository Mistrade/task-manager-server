import {UserModel} from "../models/User";
import {UserModelResponse} from "../../common/transform/session/types";
import {utcString} from "../../common/common";

export class UserModelHelper {
	public static getPopulatedUserWithoutPassword(user: UserModel): UserModelResponse {
		return {
			_id: user._id,
			name: user.name,
			surname: user.surname,
			email: user.email,
			lastUpdate: utcString(user.lastUpdate),
			created: utcString(user.created),
			patronymic: user.patronymic,
			phone: user.phone
		}
	}
}