import { Types } from 'mongoose';
import { EventInviteAccessRights } from '../../../../mongo/models/event-invite.model';
import {
  CalendarPriorityKeys,
  EventLinkItem,
  ICheckListItem,
  TaskStatusesType,
} from '../../../../mongo/models/event.model';
import { ApiResponse } from '../../../types';
import { AuthRequest } from '../types';

export interface ByEventIdType {
  eventId: Types.ObjectId;
}

export interface EventHandler_Create_RequestData {
  title: string;
  type: 'event';
  status: TaskStatusesType;
  priority: CalendarPriorityKeys;
  time: string;
  timeEnd: string;
  link: EventLinkItem | null;
  description?: string;
  group: Types.ObjectId;
  linkedFrom?: Types.ObjectId;
  parentId?: Types.ObjectId;
  members?: Array<{
    _id: Types.ObjectId;
    accessRights: EventInviteAccessRights;
  }>;
  attachCheckList: boolean;
  checkList: {
    title: string;
    data: Array<ICheckListItem>;
  };
}

export interface EventHandlerObject {
  //Обработчик запроса на создание события
  create(
    request: AuthRequest<EventHandler_Create_RequestData>,
    response: ApiResponse<ByEventIdType | null>
  ): Promise<ApiResponse<ByEventIdType | null>>;

  remove(
    request: AuthRequest<ByEventIdType>,
    response: ApiResponse<null>
  ): Promise<ApiResponse<null>>;
}
