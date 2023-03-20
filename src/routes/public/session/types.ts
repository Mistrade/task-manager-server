import { UserModelType } from '../../../mongo/models/user.model';

export interface RegistrationRequestBody {
  phone: string;
  password: string;
  name: string;
  surname: string;
}

export type UtcDateString = string;
export type UtcDate = Date;

export interface UserModelResponse
  extends Omit<UserModelType, 'password' | 'lastUpdate' | 'created'> {
  lastUpdate: UtcDateString;
  created: UtcDateString;
}
