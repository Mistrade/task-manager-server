import { Types } from 'mongoose';
import { TContactsSchemaDefault } from '../../../mongo/models/contacts.model';
import { TFriendRequestStatuses } from '../../../mongo/models/friend-request.model';
import { ApiResponse } from '../../types';
import { AuthRequest } from '../plannings/types';
import { UserModelResponse } from '../session/types';

export interface IContactsRequestProps {
  addContact: IAddContactRequestProps;
  getContacts: { contactType: IGetContactsProps['type'] };
  responseOnFriendsOrder: IResponseOnFriendsOrderRequestProps;
  removeFriend: {
    _id: Types.ObjectId;
  };
}

export interface IContactsResponseProps {
  addContact: null;
  getContacts: TGetContactsResponseArray;
  responseOnFriendsOrder: null;
  removeFriend: null;
}

export interface IAddContactRequestProps {
  phoneOrEmail: string;
}

export interface IGetContactsProps {
  type: 'friends' | 'outgoing' | 'incoming';
}

export type TGetContactsResponseObject = {
  userInfo: UserModelResponse;
  acceptedStatus: TFriendRequestStatuses;
} & Omit<TContactsSchemaDefault, 'acceptedStatus'>;

export type TGetContactsResponseArray = Array<TGetContactsResponseObject>;

export interface IResponseOnFriendsOrderRequestProps {
  acceptedStatus: TFriendRequestStatuses;
  _id: Types.ObjectId;
}

export interface IContactsController {
  addContact(
    request: AuthRequest<IContactsRequestProps['addContact']>,
    response: ApiResponse<IContactsResponseProps['addContact']>
  ): Promise<ApiResponse<IContactsResponseProps['addContact']>>;

  getContacts(
    request: AuthRequest<null, IContactsRequestProps['getContacts']>,
    response: ApiResponse<IContactsResponseProps['getContacts']>
  ): Promise<ApiResponse<IContactsResponseProps['getContacts']>>;

  responseOnFriendsOrder(
    request: AuthRequest<IContactsRequestProps['responseOnFriendsOrder']>,
    response: ApiResponse<IContactsResponseProps['responseOnFriendsOrder']>
  ): Promise<ApiResponse<IContactsResponseProps['responseOnFriendsOrder']>>;

  removeFriend(
    request: AuthRequest<IContactsRequestProps['removeFriend']>,
    response: ApiResponse<IContactsResponseProps['removeFriend']>
  ): Promise<ApiResponse<IContactsResponseProps['removeFriend']>>;
}
