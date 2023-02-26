import {GetChainsByEventIdFn} from "./types";
import {CatchErrorHandler, ResponseException} from "../../../exceptions/ResponseException";
import {EventChainsHelper} from "./helpers/EventChainsHelper";

export const getChainsByEventId: GetChainsByEventIdFn = async (request, response) => {
	try {
		const {user, params} = request
		
		const chainsApi = new EventChainsHelper(user)
		
		const result = await chainsApi.getChainsByEventId(params.eventId)
		
		const {status, json} = new ResponseException(
			ResponseException.createSuccessObject(result)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.log(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}