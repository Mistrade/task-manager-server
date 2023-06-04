import { HydratedDocument, Types } from 'mongoose';
import { objectIdIsEquals } from '../../../../common/common';
import { IValidatePhoneOrEmail } from '../../../../common/types';
import { Validate } from '../../../../common/validate';
import { ResponseException } from '../../../../exceptions/response.exception';
import { UserModelHelper } from '../../../../mongo/helpers/user.helper';
import {
  ContactAcceptStatuses,
  ContactsModel,
  IContactsSchema,
} from '../../../../mongo/models/contacts.model';
import {
  FriendRequestModel,
  friendRequestStatuses,
  FRIENDS_REQUEST_TYPES,
  IFriendRequestModel,
  IFriendRequestSchema,
} from '../../../../mongo/models/friend-request.model';
import {
  FriendModel,
  IFriendsModel,
} from '../../../../mongo/models/friend.model';
import {
  SelectedPopulateUserFields,
  UserModel,
  UserModelType,
} from '../../../../mongo/models/user.model';
import { AnyObject } from '../../plannings/history/helper/history.helper';
import { SessionController } from '../../session/session.controller';
import { UserModelResponse } from '../../session/types';
import {
  IResponseOnFriendsOrderRequestProps,
  TGetContactsResponseObject,
} from '../types';

export class FriendsHelper {
  public readonly user: UserModelResponse;

  constructor(user?: UserModelResponse) {
    this.user = new SessionController(user).checkUser();
  }

  public async getFriends(): Promise<Array<UserModelResponse>> {
    const model: IFriendsModel<UserModelResponse> | null =
      await FriendModel.findOne({
        user: this.user._id,
      }).populate({
        path: 'friendsList',
        select: SelectedPopulateUserFields,
      });

    if (!model) {
      return [];
    }

    return model.friendsList;
  }

  private async pushToUserFriendsList(
    userId: Types.ObjectId,
    pushedUserId: Types.ObjectId
  ): Promise<void> {
    const userFriends = await FriendModel.findOne({
      user: userId,
    });

    if (!userFriends) {
      const model = new FriendModel({
        user: userId,
        friendsList: [pushedUserId],
      });

      await model.save(async function (err) {
        if (err) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              'Не удалось добавить пользователя в список друзей'
            )
          );
        }
      });
    } else {
      userFriends.friendsList.push(pushedUserId);

      return await userFriends.save(async function (err, result) {
        if (err) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              'Не удалось добавить пользователя в список друзей'
            )
          );
        }

        return null;
      });
    }
  }

  public async responseOnFriendRequest(
    options: IResponseOnFriendsOrderRequestProps
  ): Promise<void> {
    const friendReq: HydratedDocument<IFriendRequestModel> | null =
      await FriendRequestModel.findOne({
        _id: options._id,
      });

    if (!friendReq) {
      throw new ResponseException(
        ResponseException.createObject(404, 'error', 'Запрос не найден')
      );
    }

    if (options.acceptedStatus === 'accepted') {
      await this.pushToUserFriendsList(this.user._id, friendReq.fromUser._id);
      await this.pushToUserFriendsList(friendReq.fromUser._id, this.user._id);
      await friendReq.remove(function (removeErr) {
        if (removeErr) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              'Не удалось закрыть запрос в друзья'
            )
          );
        }
      });
    } else {
      friendReq.acceptedStatus = options.acceptedStatus;

      friendReq.save(async function (err, result) {
        if (err) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              'Не удалось сохранить изменения'
            )
          );
        }

        return result;
      });
    }
  }

  private buildFilterForFindUser(
    type: IValidatePhoneOrEmail['type'],
    value: string
  ) {
    return {
      [`${type}`]: value,
    };
  }

  public async createFriendRequest(phoneOrEmail: string): Promise<void> {
    const valueType = await Validate.validatePhoneOrNumber(phoneOrEmail);

    if (!valueType) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Некорректный номер телефона или email'
        )
      );
    }

    let findValue = phoneOrEmail.toLowerCase();

    if (valueType.type === 'phone') {
      findValue = Validate.standardizePhone(findValue);
    }

    const invitedUser: UserModelType | null = await UserModel.findOne(
      this.buildFilterForFindUser(valueType.type, findValue)
    );

    if (!invitedUser) {
      throw new ResponseException(
        ResponseException.createObject(404, 'error', 'Пользователь не найден')
      );
    }

    if (objectIdIsEquals(invitedUser._id, this.user._id)) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Нельзя отправлять приглашения самому себе'
        )
      );
    }

    const alreadyExists: IContactsSchema | null =
      await FriendRequestModel.findOne({
        $or: [
          {
            fromUser: invitedUser._id,
            toUser: this.user._id,
          },
          {
            fromUser: this.user._id,
            toUser: invitedUser._id,
          },
        ],
      });

    if (alreadyExists) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Приглашение уже отправлено'
        )
      );
    }

    const friendRequest = new FriendRequestModel<IFriendRequestSchema>({
      fromUser: this.user._id,
      toUser: invitedUser._id,
      acceptedStatus: friendRequestStatuses.created,
    });

    return await friendRequest.save((error, result: IFriendRequestModel) => {
      if (error) {
        throw new ResponseException(
          ResponseException.createObject(
            500,
            'error',
            error?.message ||
              'Не удалось отправить запрос на добавление в друзья, попробуйте снова.'
          )
        );
      }

      return result;
    });
  }

  private transformIncomingItem(
    item: IFriendRequestModel
  ): TGetContactsResponseObject {
    return {
      userInfo: UserModelHelper.getPopulatedUserWithoutPassword(item.fromUser),
      acceptedStatus: item.acceptedStatus,
      _id: item._id,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private transformOutgoingItem(
    item: IFriendRequestModel
  ): TGetContactsResponseObject {
    return {
      userInfo: UserModelHelper.getPopulatedUserWithoutPassword(item.toUser),
      acceptedStatus: item.acceptedStatus,
      _id: item._id,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private buildGetContactsFilter(
    type: FRIENDS_REQUEST_TYPES
  ): AnyObject | null {
    switch (type) {
      case FRIENDS_REQUEST_TYPES.INCOMING:
        return {
          toUser: this.user._id,
          acceptedStatus: friendRequestStatuses.created,
        };
      case FRIENDS_REQUEST_TYPES.OUTGOING:
        return {
          fromUser: this.user._id,
          acceptedStatus: {
            $in: [friendRequestStatuses.created, friendRequestStatuses.decline],
          },
        };
      default:
        return null;
    }
  }

  public async getRequests(
    type: FRIENDS_REQUEST_TYPES
  ): Promise<Array<TGetContactsResponseObject>> {
    if (
      type !== FRIENDS_REQUEST_TYPES.INCOMING &&
      type !== FRIENDS_REQUEST_TYPES.OUTGOING
    ) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Сервер получил неизвестный параметр и отклонил запрос'
        )
      );
    }

    const filters = this.buildGetContactsFilter(type);

    if (!filters) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Невалидные входящие параметры для поиска списка контактов'
        )
      );
    }

    const requests: Array<IFriendRequestModel> | null =
      await FriendRequestModel.find(filters, {}, { sort: { createdAt: -1 } });

    if (!requests) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось получить список контактов'
        )
      );
    }

    console.log(JSON.stringify({ requests, user: this.user }, null, '  '));

    return requests.map((item) => {
      switch (type) {
        case FRIENDS_REQUEST_TYPES.OUTGOING:
          return this.transformOutgoingItem(item);
        case FRIENDS_REQUEST_TYPES.INCOMING:
          return this.transformIncomingItem(item);
      }
    });
  }

  public async removeFriend(_id: Types.ObjectId): Promise<void> {
    if (!_id) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'На вход ожидался идентификатор пользователя'
        )
      );
    }

    await ContactsModel.deleteOne(
      {
        $or: [
          { requestUser: this.user._id, responseUser: _id },
          { requestUser: _id, responseUser: this.user._id },
        ],
        acceptedStatus: ContactAcceptStatuses.ACCEPTED,
      },
      {},
      (error) => {
        if (error) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              error?.message ||
                'Не удалось удалить пользователя из списка друзей'
            )
          );
        }
      }
    );
  }
}
