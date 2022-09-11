import {UserModel} from "../../../mongo/models/User";
import {UserModelResponse} from "./types";
import dayjs from "dayjs";

export interface SessionTransformerObject {
	userModelResponse: (data: UserModel) => UserModelResponse
}

export const SessionTransformer: SessionTransformerObject = {
	userModelResponse(data) {
		return {
			_id: data._id,
			created: dayjs(data.created).utc().toString(),
			phone: data.phone,
			name: data.name,
			surname: data.surname,
			email: data.email,
			patronymic: data.patronymic,
			lastUpdate: dayjs(data.lastUpdate).utc().toString(),
		}
	}
}