import {AuthRequest, FilterTaskStatuses} from "../index";
import {ByEventIdType} from "../events/types";
import {ApiResponse} from "../../types";
import {
	CalendarPriorityKeys,
	EventLinkItem,
	EventModelType,
	PriorityKeys,
	TaskStatusesType
} from "../../../mongo/models/EventModel";
import {UserModelResponse, UtcDateString} from "../../../common/transform/session/types";
import {GroupsModelResponse} from "../../../mongo/models/Group";
import {Schema} from "mongoose";
import {EventInviteAcceptedStatuses, EventInviteAccessRights} from "../../../mongo/models/EventInvite";
import {Dayjs} from "dayjs";
import {AnyObject} from "../history/helper/historyHelper";
import {CustomObject} from "../../../common/common";

export type DateInputValue = Dayjs | Date | string | undefined

export interface DateQueryObject {
	time?: Date | AnyObject,
	timeEnd?: Date | AnyObject
	$or?: Array<AnyObject>
}

//Список полей из интерфейса EventModelType, тип которых = Date
export type EventModelDateFields = 'time' | 'timeEnd' | "createdAt" | 'updatedAt'
export type EventModelFieldsWithPopulatedUser = "userId" | "group" | 'invites' | 'likedUsers'

//Объект, исключающий из EventModelType все type=Date ключи
type DefaultEventResponseAfterOmit = Omit<EventModelType, EventModelDateFields | EventModelFieldsWithPopulatedUser>

export interface BuildResponseEventObjectOptions {
	accessRights?: EventInviteAccessRights,
	acceptedStatus?: EventInviteAcceptedStatuses
}

//Объект, описывающий обычное тело события, для запроса .get('planning/events/info/:eventId')
export interface DefaultEventItemResponse extends DefaultEventResponseAfterOmit, BuildResponseEventObjectOptions {
	time: UtcDateString,
	timeEnd: UtcDateString,
	createdAt: UtcDateString,
	updatedAt: UtcDateString,
	userId: UserModelResponse,
	group: GroupsModelResponse | null,
	invites: Array<Schema.Types.ObjectId>,
	isLiked: boolean
}

export type ShortEventItemResponseFields =
	'title'
	| 'time'
	| 'timeEnd'
	| 'link'
	| '_id'
	| 'priority'
	| 'description'
	| 'status'
	| 'group'
	| 'isLiked'
export type ShortEventItemResponse = Pick<DefaultEventItemResponse, ShortEventItemResponseFields>

//Объект, описывающий фильтры, по которым могут выполняться запросы к серверу
export interface RequestEventFilters {
	fromDate?: string,
	toDate?: string,
	title?: string | null,
	priority?: CalendarPriorityKeys | null,
	taskStatus?: FilterTaskStatuses,
	onlyFavorites?: boolean,
	utcOffset?: number,
	findOnlyInSelectedGroups?: boolean,
	exclude?: {
		eventIds?: Array<Schema.Types.ObjectId>,
		linkedFrom?: Schema.Types.ObjectId,
		parentId?: Schema.Types.ObjectId,
	}
}

interface MapBuildTypes {
	short: ShortEventItemResponse,
	default: DefaultEventItemResponse
}

export type EventBuildTypes = keyof MapBuildTypes

export type ReturnEventTypeAfterBuild<BuildType extends EventBuildTypes> = MapBuildTypes[BuildType]


export type EventsStorageYear<T extends EventBuildTypes> = CustomObject<EventsStorageMonth<T>>
export type EventsStorageMonth<T extends EventBuildTypes> = CustomObject<EventsStorageDate<T>>
export type EventsStorageDate<T extends EventBuildTypes> = Array<ShortEventItemResponse>
export type EventsStorage<T extends EventBuildTypes> = CustomObject<EventsStorageYear<T>>
export type EventCounterOfStatus = {
	[key in FilterTaskStatuses]: number
}

export type EventSchemeResponse = {
	[key in string]: boolean
}

export interface UpdateEventPriority {
	id: Schema.Types.ObjectId,
	field: 'priority',
	data: PriorityKeys
}

export interface UpdateEventStatus {
	id: Schema.Types.ObjectId,
	field: 'status',
	data: TaskStatusesType
}

export interface UpdateEventLinkItem {
	id: Schema.Types.ObjectId,
	field: 'link',
	data: EventLinkItem | null
}

export interface UpdateEventTime {
	id: Schema.Types.ObjectId,
	field: 'time' | 'timeEnd',
	data: UtcDateString
}

export interface UpdateEventTitleOrDescription {
	id: Schema.Types.ObjectId,
	field: 'title' | 'description',
	data: string
}

export interface UpdateEventGroup {
	id: Schema.Types.ObjectId,
	field: 'group',
	data: Schema.Types.ObjectId
}

export interface UpdateEventIsLiked {
	id: Schema.Types.ObjectId,
	field: 'isLiked',
	data: boolean
}

export type UpdateEventMapTypes =
	UpdateEventPriority
	| UpdateEventStatus
	| UpdateEventLinkItem
	| UpdateEventTime
	| UpdateEventTitleOrDescription
	| UpdateEventGroup
	| UpdateEventIsLiked

export interface InfoHandlerObject {
	getEventInfoByEventId(
		request: AuthRequest<null, ByEventIdType>,
		response: ApiResponse<DefaultEventItemResponse | null>
	): Promise<ApiResponse<ReturnEventTypeAfterBuild<'default'> | null>>
	
	getShortEventsArray(
		request: AuthRequest<RequestEventFilters>,
		response: ApiResponse<Array<ReturnEventTypeAfterBuild<'short'>>>
	): Promise<ApiResponse<Array<ReturnEventTypeAfterBuild<'short'>>>>
	
	getEventsAtScope(
		request: AuthRequest<RequestEventFilters>,
		response: ApiResponse<EventsStorage<'short'>>
	): Promise<ApiResponse<EventsStorage<'short'>>>
	
	getEventCounterOfStatuses(
		request: AuthRequest<RequestEventFilters>,
		response: ApiResponse<EventCounterOfStatus>
	): Promise<ApiResponse<EventCounterOfStatus>>
	
	getEventsScheme(
		request: AuthRequest<RequestEventFilters>,
		response: ApiResponse<EventSchemeResponse>
	): Promise<ApiResponse<EventSchemeResponse>>
	
	updateEventInfo(
		request: AuthRequest<UpdateEventMapTypes>,
		response: ApiResponse
	): Promise<ApiResponse>
}