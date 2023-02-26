import {ShortEventItemResponse} from "../info/types";
import {AuthRequest} from "../index";
import {Schema} from "mongoose";
import {ApiResponse} from "../../types";

export type GetChainsByEventIdFn = (
	request: AuthRequest<null, { eventId: Schema.Types.ObjectId }>,
	response: ApiResponse<ResponseGetChainsByEventId>
) => Promise<ApiResponse<ResponseGetChainsByEventId>>

export interface ResponseGetChainsByEventId {
	parentEvent: null | ShortEventItemResponse,
	linkedFrom: null | ShortEventItemResponse,
	childOf: Array<ShortEventItemResponse> | null
}