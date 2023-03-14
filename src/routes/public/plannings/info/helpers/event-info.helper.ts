import { SessionController } from '../../../session/session.controller';
import dayjs, { Dayjs } from 'dayjs';
import { ResponseException } from '../../../../../exceptions/response.exception';
import { UserModelResponse, UtcDate } from '../../../session/types';

export class EventInfoHelper {
  public user: UserModelResponse;

  constructor(user?: UserModelResponse) {
    this.user = new SessionController(user).checkUser();
  }

  public static checkDate(
    value: Date | Dayjs | string | undefined,
    onErrorMessage?: string
  ): UtcDate {
    const date = dayjs(value);
    if (!date.isValid()) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          onErrorMessage || 'Невалидная дата'
        )
      );
    }

    return date.utc().toDate();
  }

  public async update() {}
}
