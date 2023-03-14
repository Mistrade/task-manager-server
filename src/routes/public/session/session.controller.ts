import { ResponseException } from '../../../exceptions/response.exception';
import { UserModelResponse } from './types';

export class SessionController {
  public user?: UserModelResponse | null;

  constructor(user?: UserModelResponse | null) {
    this.user = user;
  }

  public checkUser(): UserModelResponse {
    if (!this.user?._id) {
      throw new ResponseException(
        ResponseException.createObject(
          403,
          'error',
          'Не удалось проверить пользователя'
        )
      );
    }

    return this.user;
  }
}
