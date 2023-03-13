import {HistoryListByEventIdFn} from "./types";
import {CatchErrorHandler, ResponseException} from "../../../exceptions/ResponseException";
import {SessionHandler} from "../../SessionRouter/SessionHandler";
import {HistoryHelper} from "./helper/historyHelper";

export const getHistoryListByEventId: HistoryListByEventIdFn = async (request, response) => {
	try {
		let {user, params: {eventId}} = request
		
		user = new SessionHandler(user).checkUser()
		
		const historyApi = new HistoryHelper(user)
		
		const historyList = await historyApi.getHistoryListByEventId(eventId)
		
		const {status, json} = new ResponseException(
			ResponseException.createSuccessObject(historyList)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.log(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}