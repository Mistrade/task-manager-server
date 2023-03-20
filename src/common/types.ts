import { UserModelType } from '../mongo/models/user.model';

export interface IValidatePhoneOrEmail {
  type: keyof Pick<UserModelType, 'phone' | 'email'>;
}
