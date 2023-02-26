import {InfoHandlerObject} from "./types";
import {SessionHandler} from "../../SessionRouter/SessionHandler";
import {CatchErrorHandler, ResponseException} from "../../../exceptions/ResponseException";
import {EventHelper} from "../events/helpers/eventHelper";

const getEventInfoByEventId: InfoHandlerObject['getEventInfoByEventId'] = async (req, res) => {
	try {
		
		let {user, params} = req
		user = new SessionHandler(user).checkUser()
		
		const {eventId} = params
		
		const eventHelper = new EventHelper(user)
		
		const {result: event} = await eventHelper.getEventWithCheckRoots(
			{_id: eventId},
			'creator-or-member'
		)
		
		const result = new ResponseException(
			ResponseException.createSuccessObject(EventHelper.buildDefaultEventResponseObject(event))
		)
		
		return res.status(result.status).json(result.json)
	} catch (e) {
		console.error('error in get event info by event Id', e)
		const {status, json} = CatchErrorHandler(e)
		return res.status(status).json(json)
	}
},