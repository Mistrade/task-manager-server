import { Dayjs } from 'dayjs';
import { Schema } from 'mongoose';
import { CustomObject } from '../../../../common/common.types';
import {
  AccessRightsWithOwner,
  EventInviteAcceptedStatuses,
} from '../../../../mongo/models/event-invite.model';
import {
  CalendarPriorityKeys,
  EventLinkItem,
  EventModelType,
  PriorityKeys,
  TaskStatusesType,
} from '../../../../mongo/models/event.model';
import { GroupsModelResponse } from '../../../../mongo/models/groups.model';
import { ApiResponse } from '../../../types';
import { UserModelResponse, UtcDateString } from '../../session/types';
import { ByEventIdType } from '../events/types';
import { AnyObject } from '../history/helper/history.helper';
import { AuthRequest, FilterTaskStatuses } from '../types';

export type DateInputValue = Dayjs | Date | string | undefined;

export interface DateQueryObject {
  time?: Date | AnyObject;
  timeEnd?: Date | AnyObject;
  $or?: Array<AnyObject>;
}

//Список полей из интерфейса EventModelType, тип которых = Date
export type EventModelDateFields =
  | 'time'
  | 'timeEnd'
  | 'createdAt'
  | 'updatedAt';
export type EventModelFieldsWithPopulatedUser =
  | 'userId'
  | 'group'
  | 'invites'
  | 'likedUsers';

//Объект, исключающий из EventModelType все type=Date ключи
type DefaultEventResponseAfterOmit = Omit<
  EventModelType,
  EventModelDateFields | EventModelFieldsWithPopulatedUser
>;

export interface BuildResponseEventObjectOptions {
  accessRights?: AccessRightsWithOwner;
  acceptedStatus?: EventInviteAcceptedStatuses;
}

//Объект, описывающий обычное тело события, для запроса .get('planning/events/info/:eventId')
export interface DefaultEventItemResponse
  extends DefaultEventResponseAfterOmit,
    BuildResponseEventObjectOptions,
    AdditionalEventFields {
  time: UtcDateString;
  timeEnd: UtcDateString;
  createdAt: UtcDateString;
  updatedAt: UtcDateString;
  userId: UserModelResponse;
  group: GroupsModelResponse | null;
  invites: Array<Schema.Types.ObjectId>;
  isLiked: boolean;
}

export type ShortEventItemResponseFields =
  | 'title'
  | 'time'
  | 'timeEnd'
  | 'link'
  | '_id'
  | 'priority'
  | 'description'
  | 'status'
  | 'group'
  | 'isLiked'
  | 'userId'
  | 'treeId';
export type ShortEventItemResponse = AdditionalEventFields &
  Pick<DefaultEventItemResponse, ShortEventItemResponseFields>;

export interface AdditionalEventFields {
  isDelayed: boolean;
}

export type ChainsTypes = 'parentOf' | 'childOf';

//Объект, описывающий фильтры, по которым могут выполняться запросы к серверу
export interface RequestEventFilters {
  fromDate?: string;
  toDate?: string;
  title?: string | null;
  priority?: CalendarPriorityKeys | null;
  taskStatus?: FilterTaskStatuses;
  onlyFavorites?: boolean;
  utcOffset?: number;
  findOnlyInSelectedGroups?: boolean;
  exclude?: {
    eventIds?: Array<Schema.Types.ObjectId>;
    linkedFrom?: Schema.Types.ObjectId;
    parentId?: Schema.Types.ObjectId;
  };
  chainsFilter?: {
    type: ChainsTypes;
    eventId: Schema.Types.ObjectId;
  }; //учитывать тип связей
}

interface MapBuildTypes {
  short: ShortEventItemResponse;
  default: DefaultEventItemResponse;
}

export type EventBuildTypes = keyof MapBuildTypes;

export type ReturnEventTypeAfterBuild<BuildType extends EventBuildTypes> =
  MapBuildTypes[BuildType];

export type EventsStorageYear<T extends EventBuildTypes> = CustomObject<
  EventsStorageMonth<T>
>;
export type EventsStorageMonth<T extends EventBuildTypes> = CustomObject<
  EventsStorageDate<T>
>;
export type EventsStorageDate<T extends EventBuildTypes> =
  Array<ShortEventItemResponse>;
export type EventsStorage<T extends EventBuildTypes> = CustomObject<
  EventsStorageYear<T>
>;
export type EventCounterOfStatus = {
  [key in FilterTaskStatuses]: number;
};

export type EventSchemeResponse = {
  [key in string]: boolean;
};

export interface UpdateEventPriority {
  id: Schema.Types.ObjectId;
  field: 'priority';
  data: PriorityKeys;
}

export interface UpdateEventStatus {
  id: Schema.Types.ObjectId;
  field: 'status';
  data: TaskStatusesType;
}

export interface UpdateEventLinkItem {
  id: Schema.Types.ObjectId;
  field: 'link';
  data: EventLinkItem | null;
}

export interface UpdateEventTime {
  id: Schema.Types.ObjectId;
  field: 'time' | 'timeEnd';
  data: UtcDateString;
}

export interface UpdateEventTitleOrDescription {
  id: Schema.Types.ObjectId;
  field: 'title' | 'description';
  data: string;
}

export interface UpdateEventGroup {
  id: Schema.Types.ObjectId;
  field: 'group';
  data: Schema.Types.ObjectId;
}

export interface UpdateEventIsLiked {
  id: Schema.Types.ObjectId;
  field: 'isLiked';
  data: boolean;
}

export type UpdateEventMapTypes =
  | UpdateEventPriority
  | UpdateEventStatus
  | UpdateEventLinkItem
  | UpdateEventTime
  | UpdateEventTitleOrDescription
  | UpdateEventGroup
  | UpdateEventIsLiked;

export interface InfoHandlerObject {
  getEventInfoByEventId(
    request: AuthRequest<null, ByEventIdType>,
    response: ApiResponse<DefaultEventItemResponse | null>
  ): Promise<ApiResponse<ReturnEventTypeAfterBuild<'default'> | null>>;

  getShortEventsArray(
    request: AuthRequest<RequestEventFilters>,
    response: ApiResponse<Array<ReturnEventTypeAfterBuild<'short'>>>
  ): Promise<ApiResponse<Array<ReturnEventTypeAfterBuild<'short'>>>>;

  getEventsAtScope(
    request: AuthRequest<RequestEventFilters>,
    response: ApiResponse<EventsStorage<'short'>>
  ): Promise<ApiResponse<EventsStorage<'short'>>>;

  getEventCounterOfStatuses(
    request: AuthRequest<RequestEventFilters>,
    response: ApiResponse<EventCounterOfStatus>
  ): Promise<ApiResponse<EventCounterOfStatus>>;

  getEventsScheme(
    request: AuthRequest<RequestEventFilters>,
    response: ApiResponse<EventSchemeResponse>
  ): Promise<ApiResponse<EventSchemeResponse>>;

  updateEventInfo(
    request: AuthRequest<UpdateEventMapTypes>,
    response: ApiResponse
  ): Promise<ApiResponse>;
}
