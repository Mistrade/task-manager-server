import { model, Schema } from 'mongoose';
import { UserModelResponse } from '../../routes/public/session/types';

export interface UserModelType {
  _id: Schema.Types.ObjectId;
  email?: string;
  phone: string;
  name?: string;
  surname?: string;
  patronymic?: string;
  created: Date;
  lastUpdate?: Date;
  password: string;
}

export type TUserOmitPassword = Omit<UserModelType, 'password'>;

export type ShortUserModel = Pick<
  UserModelResponse,
  'name' | 'surname' | '_id'
>;

export const SelectedPopulateUserFields: Array<keyof UserModelType> = [
  '_id',
  'email',
  'phone',
  'name',
  'surname',
  'patronymic',
  'created',
  'lastUpdate',
];

const UserSchema = new Schema({
  email: { type: String, required: false },
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  patronymic: { type: String, required: false },
  created: { type: Date, required: true },
  lastUpdate: { type: Date, required: true },
  password: { type: String, required: true },
});

export const UserModel = model<UserModelType>('User', UserSchema);
