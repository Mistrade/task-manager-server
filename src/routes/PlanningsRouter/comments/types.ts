import {AuthRequest} from "../types";
import {ApiResponse} from "../../types";
import {Schema} from "mongoose";
import {CommentModel} from "../../../mongo/models/Comment";
import {DefaultEventItemResponse} from "../info/types";

export interface CreateCommentProps {
	message: string,
	eventId: Schema.Types.ObjectId,
	sourceCommentId?: Schema.Types.ObjectId | null
}

export interface CommentResponseModel extends Omit<CommentModel, 'likedUsers'> {
	editable: boolean,
	deletable: boolean,
	isImportant: boolean
}

export interface GetCommentByEventIdReturned {
	comments: Array<CommentModel>,
	buildEvent: DefaultEventItemResponse,
}

export interface RemoveCommentProps {
	commentId: Schema.Types.ObjectId
}

export interface GetCommentListProps {
	eventId: Schema.Types.ObjectId
}

export interface UpdateCommentIsImportantState {
	commentId: Schema.Types.ObjectId,
	fieldName: 'isImportant',
	state: "toggle" | boolean
}

export interface UpdateCommentMessageState {
	commentId: Schema.Types.ObjectId,
	fieldName: 'content',
	state: Omit<CreateCommentProps, 'eventId'>
}

export type EditCommentRequestProps = UpdateCommentMessageState | UpdateCommentIsImportantState

export interface CommentsControllerObject {
	createCommentToEvent(
		request: AuthRequest<CreateCommentProps>,
		response: ApiResponse
	): Promise<ApiResponse>
	
	removeComment(
		request: AuthRequest<RemoveCommentProps>,
		response: ApiResponse
	): Promise<ApiResponse>
	
	getCommentListByEventId(
		request: AuthRequest<null, GetCommentListProps>,
		response: ApiResponse<Array<CommentResponseModel>>
	): Promise<ApiResponse<Array<CommentResponseModel>>>
	
	toggleIsLikedComment(
		request: AuthRequest<UpdateCommentIsImportantState>,
		response: ApiResponse
	): Promise<ApiResponse>
	
	updateComment(
		request: AuthRequest<UpdateCommentMessageState>,
		response: ApiResponse
	): Promise<ApiResponse>
}