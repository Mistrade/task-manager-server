import { Types } from 'mongoose';
import { ICheckListItemSchema } from '../../../../mongo/models/check-list.model';

export type ICreateCheckListItemProps = Omit<
  ICheckListItemSchema,
  '_id' | 'createdAt' | 'updatedAt'
>;

export interface ICreateCheckListProps {
  title: string;
  eventId: Types.ObjectId;
  data: Array<ICreateCheckListItemProps>;
}

export interface CheckListUpdateMainTitleRequest {
  fieldName: 'title';
  _id: Types.ObjectId;
  data: string;
}

export interface CheckListUpdateItemTitleRequest {
  fieldName: 'item-title';
  _id: Types.ObjectId;
  data: {
    itemId: Types.ObjectId;
    value: string;
  };
}

export interface CheckListUpdateItemStateRequest {
  fieldName: 'item-state';
  _id: Types.ObjectId;
  data: {
    itemId: Types.ObjectId;
    value: boolean;
  };
}

export interface CheckListUpdateCreateNewElementRequest {
  fieldName: 'create';
  _id: Types.ObjectId;
  data: ICreateCheckListItemProps;
}

export interface CheckListUpdateDeleteElementRequest {
  fieldName: 'delete';
  _id: Types.ObjectId;
  data: Types.ObjectId;
}

export type CheckListUpdateRequestData =
  | CheckListUpdateMainTitleRequest
  | CheckListUpdateItemTitleRequest
  | CheckListUpdateItemStateRequest
  | CheckListUpdateCreateNewElementRequest
  | CheckListUpdateDeleteElementRequest;
