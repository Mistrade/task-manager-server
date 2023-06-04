import { Types } from 'mongoose';
import { ApiResponse } from '../../../types';
import { ShortEventItemResponse } from '../info/types';
import { AuthRequest } from '../types';
import { ProblemEventsSchema } from './helpers/tree.validator';

export type GetChainsByEventIdFn = (
  request: AuthRequest<null, { eventId: Types.ObjectId }>,
  response: ApiResponse<ResponseGetChainsByEventId>
) => Promise<ApiResponse<ResponseGetChainsByEventId>>;

export interface ResponseGetChainsByEventId {
  parentEvent: null | ShortEventItemResponse;
  linkedFrom: null | ShortEventItemResponse;
  childrenEvents: Array<ShortEventItemResponse> | null;
}

export interface ConnectChildrenRequestProps {
  eventsToAdd: Array<Types.ObjectId>;
  eventId: Types.ObjectId;
}

export type ConnectChildrenEventFn = (
  req: AuthRequest<ConnectChildrenRequestProps>,
  response: ApiResponse<{ problemEventIds: ProblemEventsSchema } | null>
) => Promise<ApiResponse>;
