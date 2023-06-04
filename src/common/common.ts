import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { GroupModel } from '../mongo/models/groups.model';
import { UserModelType } from '../mongo/models/user.model';
import { UserModelResponse } from '../routes/public/session/types';

export const createBaseCalendars = async (
  user: UserModelResponse | UserModelType
) => {
  try {
    await GroupModel.insertMany([
      {
        userId: user._id,
        title: 'Домашние дела',
        isSelected: true,
        editable: true,
        deletable: false,
        color: 'rgba(100,149,237,.9)',
        type: 'Main',
      },
      {
        userId: user._id,
        title: 'Рабочие дела',
        isSelected: true,
        editable: true,
        deletable: true,
        color: '#FFA4A4',
      },
      {
        userId: user._id,
        title: 'Приглашения',
        isSelected: true,
        editable: false,
        deletable: false,
        color: '#D46600',
        type: 'Invite',
      },
    ]);
    return true;
  } catch (e) {
    return false;
  }
};

export const utcString = (date?: Date | dayjs.Dayjs | string): string => {
  return date ? dayjs(date).utc().toString() : dayjs().utc().toString();
};

export const utcDate = (date?: Date | dayjs.Dayjs | string): Date => {
  return date ? dayjs(date).utc().toDate() : dayjs().utc().toDate();
};

export const objectIdIsEquals = (
  userObjectId1: Types.ObjectId,
  userObjectId2: Types.ObjectId
) => {
  return userObjectId1.toString() === userObjectId2.toString();
};

export const objectIdInArrayOfAnotherObjectId = (
  userId: Types.ObjectId,
  usersArray: Array<{ _id: Types.ObjectId } | Types.ObjectId>
) => {
  return usersArray.some((item) => {
    if ('_id' in item) {
      return objectIdIsEquals(userId, item._id);
    }
    return objectIdIsEquals(userId, item);
  });
};

export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
