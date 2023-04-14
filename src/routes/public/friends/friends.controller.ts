import { response } from 'express';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../exceptions/response.exception';
import {
  friendRequestStatuses,
  FRIENDS_REQUEST_TYPES,
} from '../../../mongo/models/friend-request.model';
import { ApiResponse } from '../../types';
import { AuthRequest } from '../plannings/types';
import { UserModelResponse } from '../session/types';
import { FriendsHelper } from './helpers/friends.helper';
import { IContactsController, TGetContactsResponseObject } from './types';

export const createRequestToFriends: IContactsController['addContact'] = async (
  req,
  res
) => {
  try {
    await new FriendsHelper(req.user).createFriendRequest(
      req.body.phoneOrEmail
    );

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(
        null,
        'Приглашение в друзья отправлено'
      )
    );

    return res.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return res.status(status).json(json);
  }
};

export const responseOnFriendsOrderHandler: IContactsController['responseOnFriendsOrder'] =
  async (req, res) => {
    try {
      const { user, body } = req;

      if (!friendRequestStatuses[body.acceptedStatus]) {
        throw new ResponseException(
          ResponseException.createObject(
            400,
            'error',
            'Не удалось принять запрос в друзья. Получен невалидный статус.'
          )
        );
      }

      await new FriendsHelper(user).responseOnFriendRequest(body);

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(
          null,
          body.acceptedStatus === 'accepted'
            ? 'Заявка принята'
            : 'Заявка отклонена'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  };

export const removeFriendHandler: IContactsController['removeFriend'] = async (
  req,
  res
) => {
  try {
    const {
      user,
      body: { _id },
    } = req;

    await new FriendsHelper(user).removeFriend(_id);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(null)
    );

    return res.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return res.status(status).json(json);
  }
};

export const getFriendsRequest = async (
  request: AuthRequest<null, { type: FRIENDS_REQUEST_TYPES }>,
  response: ApiResponse<Array<TGetContactsResponseObject>>
): Promise<ApiResponse<Array<TGetContactsResponseObject>>> => {
  try {
    const { user, params } = request;
    const { type } = params;

    const friendsRequests = await new FriendsHelper(user).getRequests(type);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(friendsRequests)
    );

    return response.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};

export const getFriendsList = async (
  req: AuthRequest,
  res: ApiResponse<Array<UserModelResponse>>
): Promise<ApiResponse<Array<UserModelResponse>>> => {
  try {
    const { user } = req;

    const result = await new FriendsHelper(user).getFriends();

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(result)
    );

    return res.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};
