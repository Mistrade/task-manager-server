import { UserModelResponse } from '../../session/types';
import { SessionController } from '../../session/session.controller';
import { Validate } from '../../../../common/validate';
import { ResponseException } from '../../../../exceptions/response.exception';
import { IValidatePhoneOrEmail } from '../../../../common/types';
import { UserModel, UserModelType } from '../../../../mongo/models/user.model';
import {
  contactAcceptStatusConverter,
  ContactAcceptStatuses,
  ContactsModel,
  IContactsSchema,
  TPopulatedContactsModel,
} from '../../../../mongo/models/contacts.model';
import { objectIdIsEquals } from '../../../../common/common';
import { AnyObject } from '../../plannings/history/helper/history.helper';
import {
  IGetContactsProps,
  IResponseOnFriendsOrderRequestProps,
  TGetContactsResponseObject,
} from '../types';
import { Schema } from 'mongoose';

interface IContactsHelper {
  readonly user: UserModelResponse;

  addContact(phoneOrEmail: string): Promise<TPopulatedContactsModel>;
}

export class ContactsHelper implements IContactsHelper {
  public readonly user: UserModelResponse;

  constructor(user?: UserModelResponse) {
    this.user = new SessionController(user).checkUser();
  }

  public async responseOnFriendRequest(
    options: IResponseOnFriendsOrderRequestProps
  ): Promise<void> {
    const filter: AnyObject = {
      acceptedStatus: {
        $ne: ContactAcceptStatuses[options.acceptedStatus],
      },
      _id: options._id,
      responseUser: this.user._id,
    };

    const upd = {
      acceptedStatus: ContactAcceptStatuses[options.acceptedStatus],
    };

    try {
      const friendRequest: TPopulatedContactsModel | null =
        await ContactsModel.findOneAndUpdate(filter, upd);

      if (!friendRequest) {
        throw new ResponseException(
          ResponseException.createObject(404, 'error', 'Заявка не найдена')
        );
      }
    } catch (e) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось обновить статус заявки'
        )
      );
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

  public async addContact(
    phoneOrEmail: string
  ): Promise<TPopulatedContactsModel> {
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

    const alreadyExists: IContactsSchema | null = await ContactsModel.findOne({
      responseUser: invitedUser._id,
      requestUser: this.user._id,
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

    const createdContact: TPopulatedContactsModel | null =
      await ContactsModel.create({
        requestUser: this.user._id,
        responseUser: invitedUser._id,
        acceptedStatus: ContactAcceptStatuses.CREATED,
      });

    if (!createdContact) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось создать приглашение в друзья'
        )
      );
    }

    return createdContact;
  }

  private transformFriendItem(
    item: TPopulatedContactsModel
  ): TGetContactsResponseObject {
    const isCreator = objectIdIsEquals(item.requestUser._id, this.user._id);
    return {
      userInfo: isCreator ? item.responseUser : item.requestUser,
      acceptedStatus: contactAcceptStatusConverter(item.acceptedStatus),
      _id: item._id,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private transformIncomingItem(
    item: TPopulatedContactsModel
  ): TGetContactsResponseObject {
    return {
      userInfo: item.requestUser,
      acceptedStatus: contactAcceptStatusConverter(item.acceptedStatus),
      _id: item._id,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private transformOutgoingItem(
    item: TPopulatedContactsModel
  ): TGetContactsResponseObject {
    return {
      userInfo: item.responseUser,
      acceptedStatus: contactAcceptStatusConverter(item.acceptedStatus),
      _id: item._id,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private buildGetContactsFilter(
    type: IGetContactsProps['type']
  ): AnyObject | null {
    switch (type) {
      case 'incoming':
        return {
          responseUser: this.user._id,
          acceptedStatus: ContactAcceptStatuses.CREATED,
        };
      case 'outgoing':
        return {
          requestUser: this.user._id,
          acceptedStatus: {
            $in: [ContactAcceptStatuses.CREATED, ContactAcceptStatuses.DECLINE],
          },
        };
      case 'friends':
        return {
          $or: [
            { requestUser: this.user._id },
            { responseUser: this.user._id },
          ],
          acceptedStatus: ContactAcceptStatuses.ACCEPTED,
        };
      default:
        return null;
    }
  }

  public async getContacts(
    type: IGetContactsProps['type']
  ): Promise<Array<TGetContactsResponseObject>> {
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

    const contacts: Array<TPopulatedContactsModel> | null =
      await ContactsModel.find(filters, {}, { sort: { createdAt: -1 } });

    if (!contacts) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось получить список контактов'
        )
      );
    }

    console.log(JSON.stringify({ contacts, user: this.user }, null, '  '));

    return contacts.map((item) => {
      switch (type) {
        case 'friends':
          return this.transformFriendItem(item);
        case 'outgoing':
          return this.transformOutgoingItem(item);
        case 'incoming':
          return this.transformIncomingItem(item);
      }
    });
  }

  public async removeFriend(_id: Schema.Types.ObjectId): Promise<void> {
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
