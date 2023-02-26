import {AuthRequest} from "../types";
import {ApiResponse} from "../../types";

export interface CommentsControllerObject {
	addCommentToEvent(
		request: AuthRequest,
		response: ApiResponse
	): Promise<ApiResponse>
}