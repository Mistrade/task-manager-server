import { IContactsController } from './types';
import { ContactsHelper } from './helpers/contacts.helper';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../exceptions/response.exception';
import { ContactAcceptStatuses } from '../../../mongo/models/contacts.model';

export const addContactHandler: IContactsController['addContact'] = async (
  req,
  res
) => {
  try {
    const { user, body } = req;
    const contactApi = new ContactsHelper(user);

    const contact = await contactApi.addContact(body.phoneOrEmail);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(
        null,
        'Приглашение в друзья отправлено'
      )
    );

    return res.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return res.status(status).json(json);
  }
};

export const getContactsHandler: IContactsController['getContacts'] = async (
  req,
  res
) => {
  try {
    const { user, params } = req;

    if (!params.contactType) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'На вход ожидался статус-фильтр для поиска контактов'
        )
      );
    }

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(
        await new ContactsHelper(user).getContacts(params.contactType)
      )
    );

    return res.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return res.status(status).json(json);
  }
};

export const responseOnFriendsOrderHandler: IContactsController['responseOnFriendsOrder'] =
  async (req, res) => {
    try {
      const { user, body } = req;

      if (typeof ContactAcceptStatuses[body.acceptedStatus] !== 'number') {
        throw new ResponseException(
          ResponseException.createObject(
            400,
            'error',
            'Не удалось принять запрос в друзья. Получен невалидный статус.'
          )
        );
      }

      await new ContactsHelper(user).responseOnFriendRequest(body);

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(
          null,
          body.acceptedStatus === 'ACCEPTED'
            ? 'Заявка принята'
            : 'Заявка отклонена'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  };

export const removeFriendHandler: IContactsController['removeFriend'] = async (
  req,
  res
) => {
  try {
    const {
      user,
      body: { _id },
    } = req;

    await new ContactsHelper(user).removeFriend(_id);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(null)
    );

    return res.status(status).json(json);
  } catch (e) {
    const { status, json } = CatchErrorHandler(e);
    return res.status(status).json(json);
  }
};
