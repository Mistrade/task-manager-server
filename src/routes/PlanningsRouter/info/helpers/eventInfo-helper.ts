import {UserModelResponse, UtcDate, UtcDateString} from "../../../../common/transform/session/types";
import {SessionHandler} from "../../../SessionRouter/SessionHandler";
import dayjs, {Dayjs} from "dayjs";
import {ResponseException} from "../../../../exceptions/ResponseException";

export class EventInfoHelper {
	public user: UserModelResponse
	
	constructor(user?: UserModelResponse) {
		this.user = new SessionHandler(user).checkUser()
	}
	
	public static checkDate(value: Date | Dayjs | string | undefined, onErrorMessage?: string): UtcDate {
		const date = dayjs(value)
		if(!date.isValid()){
			throw new ResponseException(
				ResponseException.createObject(400, 'error', onErrorMessage || 'Невалидная дата')
			)
		}
		
		return date.utc().toDate()
	}
	
	public async update(){
	
	}
}