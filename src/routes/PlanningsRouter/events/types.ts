import {ApiResponse} from "../../types";
import {Schema} from "mongoose";
import {CalendarPriorityKeys, EventLinkItem, TaskStatusesType} from "../../../mongo/models/EventModel";
import {EventInviteAccessRights} from "../../../mongo/models/EventInvite";
import {AuthRequest} from "../types";

export interface ByEventIdType {
	eventId: Schema.Types.ObjectId
}

export interface EventHandler_Create_RequestData {
	title: string,
	type: 'event',
	status: TaskStatusesType,
	priority: CalendarPriorityKeys,
	time: string,
	timeEnd: string,
	link: EventLinkItem | null,
	description?: string,
	group: Schema.Types.ObjectId,
	linkedFrom?: Schema.Types.ObjectId,
	parentId?: Schema.Types.ObjectId,
	members?: Array<{_id: Schema.Types.ObjectId, accessRights: EventInviteAccessRights}>
}

export interface EventHandlerObject {
	//Обработчик запроса на создание события
	create(
		request: AuthRequest<EventHandler_Create_RequestData>,
		response: ApiResponse<ByEventIdType | null>
	): Promise<ApiResponse<ByEventIdType | null>>,
	
	remove(request: AuthRequest<ByEventIdType>, response: ApiResponse<null>): Promise<ApiResponse<null>>,
}