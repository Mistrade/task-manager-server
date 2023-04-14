import { ICheckListItemSchema } from '../../../../mongo/models/check-list.model';
import { Schema } from 'mongoose';

export type ICreateCheckListItemProps = Omit<
  ICheckListItemSchema,
  '_id' | 'createdAt' | 'updatedAt'
>;

export interface ICreateCheckListProps {
  title: string;
  eventId: Schema.Types.ObjectId;
  data: Array<ICreateCheckListItemProps>;
}

export interface CheckListUpdateMainTitleRequest {
  fieldName: 'title';
  _id: Schema.Types.ObjectId;
  data: string;
}

export interface CheckListUpdateItemTitleRequest {
  fieldName: 'item-title';
  _id: Schema.Types.ObjectId;
  data: {
    itemId: Schema.Types.ObjectId;
    value: string;
  };
}

export interface CheckListUpdateItemStateRequest {
  fieldName: 'item-state';
  _id: Schema.Types.ObjectId;
  data: {
    itemId: Schema.Types.ObjectId;
    value: boolean;
  };
}

export interface CheckListUpdateCreateNewElementRequest {
  fieldName: 'create';
  _id: Schema.Types.ObjectId;
  data: ICreateCheckListItemProps;
}

export interface CheckListUpdateDeleteElementRequest {
  fieldName: 'delete';
  _id: Schema.Types.ObjectId;
  data: Schema.Types.ObjectId;
}

export type CheckListUpdateRequestData =
  | CheckListUpdateMainTitleRequest
  | CheckListUpdateItemTitleRequest
  | CheckListUpdateItemStateRequest
  | CheckListUpdateCreateNewElementRequest
  | CheckListUpdateDeleteElementRequest;
