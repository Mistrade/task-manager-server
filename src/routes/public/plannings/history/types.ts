import { Types } from 'mongoose';
import { EventHistoryQueryResult } from '../../../../mongo/models/event-history.model';
import { ApiResponse } from '../../../types';
import { AuthRequest } from '../types';

export interface BuildHistoryItemOptions {
  customDescription?: string;
  isPrivate?: boolean;
}

export type HistoryListByEventIdFn = (
  request: AuthRequest<null, { eventId: Types.ObjectId }>,
  response: ApiResponse<Array<EventHistoryQueryResult>>
) => Promise<ApiResponse<Array<EventHistoryQueryResult>>>;
