import { UserModelType } from '../models/user.model';
import { utcString } from '../../common/common';
import { UserModelResponse } from '../../routes/public/session/types';

export class UserModelHelper {
  public static getPopulatedUserWithoutPassword(
    user: UserModelType
  ): UserModelResponse {
    return {
      _id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      lastUpdate: utcString(user.lastUpdate),
      created: utcString(user.created),
      patronymic: user.patronymic,
      phone: user.phone,
    };
  }
}
