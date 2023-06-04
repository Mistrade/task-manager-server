import { Types } from 'mongoose';
import { CommentModelType } from '../../../../mongo/models/comment.model';
import { ApiResponse } from '../../../types';
import { DefaultEventItemResponse } from '../info/types';
import { AuthRequest } from '../types';

export interface CreateCommentProps {
  message: string;
  eventId: Types.ObjectId;
  sourceCommentId?: Types.ObjectId | null;
}

export interface CommentResponseModel
  extends Omit<CommentModelType, 'likedUsers'> {
  editable: boolean;
  deletable: boolean;
  isImportant: boolean;
}

export interface GetCommentByEventIdReturned {
  comments: Array<CommentModelType>;
  buildEvent: DefaultEventItemResponse;
}

export interface RemoveCommentProps {
  commentId: Types.ObjectId;
}

export interface GetCommentListProps {
  eventId: Types.ObjectId;
}

export interface UpdateCommentIsImportantState {
  commentId: Types.ObjectId;
  fieldName: 'isImportant';
  state: 'toggle' | boolean;
}

export interface UpdateCommentMessageState {
  commentId: Types.ObjectId;
  fieldName: 'content';
  state: Omit<CreateCommentProps, 'eventId'>;
}

export type EditCommentRequestProps =
  | UpdateCommentMessageState
  | UpdateCommentIsImportantState;

export interface CommentsControllerObject {
  createCommentToEvent(
    request: AuthRequest<CreateCommentProps>,
    response: ApiResponse
  ): Promise<ApiResponse>;

  removeComment(
    request: AuthRequest<RemoveCommentProps>,
    response: ApiResponse
  ): Promise<ApiResponse>;

  getCommentListByEventId(
    request: AuthRequest<null, GetCommentListProps>,
    response: ApiResponse<Array<CommentResponseModel>>
  ): Promise<ApiResponse<Array<CommentResponseModel>>>;

  toggleIsLikedComment(
    request: AuthRequest<UpdateCommentIsImportantState>,
    response: ApiResponse
  ): Promise<ApiResponse>;

  updateComment(
    request: AuthRequest<UpdateCommentMessageState>,
    response: ApiResponse
  ): Promise<ApiResponse>;
}
