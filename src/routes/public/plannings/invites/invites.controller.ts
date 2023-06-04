import { Types } from 'mongoose';
import {
  CatchResponse,
  ResponseException,
  SuccessResponse,
} from '../../../../exceptions/response.exception';
import { UserModelHelper } from '../../../../mongo/helpers/user.helper';
import {
  EventInviteModel,
  EventInviteQueryType,
} from '../../../../mongo/models/event-invite.model';
import {
  SelectedPopulateUserFields,
  UserModelType,
} from '../../../../mongo/models/user.model';
import { ApiResponse } from '../../../types';
import { SessionController } from '../../session/session.controller';
import { AuthRequest } from '../types';
import { EventInviteResponseItem } from './types';

export const getInvitesListByEventId = async (
  req: AuthRequest<null, { eventId: Types.ObjectId }>,
  res: ApiResponse<Array<EventInviteResponseItem> | null>
): Promise<ApiResponse<Array<EventInviteResponseItem> | null>> => {
  try {
    const {
      user,
      params: { eventId },
    } = req;

    new SessionController(user).checkUser();

    const arr: Array<
      Omit<EventInviteQueryType, 'invitedUser'> & { invitedUser: UserModelType }
    > = await EventInviteModel.find({
      event: eventId,
    }).populate({
      path: 'invitedUser',
      select: SelectedPopulateUserFields,
    });

    if (!arr) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Список приглашенных участников не найден.'
        )
      );
    }

    const result: Array<EventInviteResponseItem> = arr.map((invite) => ({
      user: UserModelHelper.getPopulatedUserWithoutPassword(invite.invitedUser),
      rights: invite.accessRights,
      status: invite.acceptedStatus,
      _id: invite._id,
      date: invite.createdAt,
    }));

    return SuccessResponse(result, res);
  } catch (e) {
    return CatchResponse(e, res);
  }
};
