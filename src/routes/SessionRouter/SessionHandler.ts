import {UserModel} from "../../mongo/models/User";
import {ResponseException} from "./ResponseException";
import {UserModelResponse} from "../../common/transform/session/types";

export class SessionHandler {
	public user?: UserModelResponse | null
	
	constructor(user?: UserModelResponse | null) {
		this.user = user
	}
	
	public checkUser(): UserModelResponse {
		if (!this.user?._id) {
			throw new ResponseException(
				ResponseException.createObject(403, 'error', "Не удалось проверить пользователя")
			)
		}
		
		return this.user
	}
}