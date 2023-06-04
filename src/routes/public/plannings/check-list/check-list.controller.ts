import { Types } from 'mongoose';
import {
  CatchErrorHandler,
  CatchResponse,
  ResponseException,
  SuccessResponse,
} from '../../../../exceptions/response.exception';
import { ICheckListSchema } from '../../../../mongo/models/check-list.model';
import { ApiResponse } from '../../../types';
import { AuthRequest } from '../types';
import { CheckListHelper } from './check-list.helper';
import { CheckListUpdateRequestData, ICreateCheckListProps } from './types';

export const createCheckListHandler = async (
  req: AuthRequest<ICreateCheckListProps>,
  res: ApiResponse
) => {
  try {
    const { user, body } = req;

    const checkListApi = new CheckListHelper(user);
    const item = await checkListApi.createCheckList(body);
    await checkListApi.associateCheckListWithEvent(item._id, body.eventId);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(null, 'Чек-лист успешно создан')
    );

    return res.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return res.status(status).json(json);
  }
};

export const checkListUpdateHandler = async (
  request: AuthRequest<CheckListUpdateRequestData>,
  response: ApiResponse
): Promise<ApiResponse> => {
  try {
    const { user, body } = request;

    const checkListApi = new CheckListHelper(user);

    const result = await checkListApi.updateCheckList(body);

    if (!result) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось обновить чек-лист'
        )
      );
    }

    return SuccessResponse(null, response, 'Чек-лист успешно обновлен');
  } catch (e) {
    return CatchResponse(e, response);
  }
};

export const getCheckListByEventIdHandler = async (
  request: AuthRequest<null, { eventId: Types.ObjectId }>,
  response: ApiResponse<ICheckListSchema | null>
) => {
  try {
    const {
      user,
      params: { eventId },
    } = request;

    const checkListApi = new CheckListHelper(user);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(
        await checkListApi.getCheckListByEventId(eventId)
      )
    );
    return response.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};
