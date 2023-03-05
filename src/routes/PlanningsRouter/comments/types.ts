import {AuthRequest} from "../types";
import {ApiResponse} from "../../types";
import {Schema} from "mongoose";
import {CommentModel} from "../../../mongo/models/Comment";

export interface CreateCommentProps {
	message: string,
	eventId: Schema.Types.ObjectId,
	sourceCommentId?: Schema.Types.ObjectId | null
}

export interface RemoveCommentProps {
	commentId: Schema.Types.ObjectId
}

export interface GetCommentListProps {
	eventId: Schema.Types.ObjectId
}

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
		response: ApiResponse<Array<CommentModel>>
	): Promise<ApiResponse<Array<CommentModel>>>
}