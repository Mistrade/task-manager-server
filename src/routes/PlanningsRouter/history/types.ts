import {ApiResponse} from "../../types";
import {Schema} from "mongoose";
import {EventHistoryQueryResult} from "../../../mongo/models/EventHistory";
import {AuthRequest} from "../types";

export interface BuildHistoryItemOptions {
	customDescription?: string,
	isPrivate?: boolean
}

export type HistoryListByEventIdFn = (
	request: AuthRequest<null, { eventId: Schema.Types.ObjectId }>,
	response: ApiResponse<Array<EventHistoryQueryResult>>
) => Promise<ApiResponse<Array<EventHistoryQueryResult>>>