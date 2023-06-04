import { Types } from 'mongoose';
import {
  EventInviteAcceptedStatuses,
  EventInviteAccessRights,
} from '../../../../mongo/models/event-invite.model';
import { UserModelResponse, UtcDate } from '../../session/types';

export interface EventInviteResponseItem {
  user: UserModelResponse;
  date: UtcDate;
  rights: EventInviteAccessRights;
  status: EventInviteAcceptedStatuses;
  _id: Types.ObjectId;
}
