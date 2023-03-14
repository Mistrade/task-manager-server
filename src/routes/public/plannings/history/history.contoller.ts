import { HistoryListByEventIdFn } from './types';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../../exceptions/response.exception';
import { SessionController } from '../../session/session.controller';
import { HistoryHelper } from './helper/history.helper';

export const getHistoryListByEventId: HistoryListByEventIdFn = async (
  request,
  response
) => {
  try {
    let {
      user,
      params: { eventId },
    } = request;

    user = new SessionController(user).checkUser();

    const historyApi = new HistoryHelper(user);

    const historyList = await historyApi.getHistoryListByEventId(eventId);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(historyList)
    );

    return response.status(status).json(json);
  } catch (e) {
    console.log(`error in ${request.originalUrl}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};
