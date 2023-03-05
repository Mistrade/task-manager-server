import {UserModelResponse} from "../../../../common/transform/session/types";
import {CommentsHelper} from "./comments.helper";
import {SessionHandler} from "../../../SessionRouter/SessionHandler";
import {
	CommentResponseModel,
	EditCommentRequestProps,
	UpdateCommentIsImportantState,
	UpdateCommentMessageState
} from "../types";
import {HydratedDocument} from "mongoose";
import {Comment, CommentModel} from "../../../../mongo/models/Comment";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {EventHelper} from "../../events/helpers/eventHelper";
import {objectIdIsEquals} from "../../../../common/common";

export class UpdateCommentHelper extends CommentsHelper {
	public user: UserModelResponse
	
	constructor(user?: UserModelResponse) {
		const checkedUser = new SessionHandler(user).checkUser()
		super(checkedUser)
		this.user = checkedUser
	}
	
	private async updateIsImportant(newState: UpdateCommentIsImportantState, comment: CommentModel): Promise<void> {
		const eventApi = new EventHelper(this.user)
		
		const event = await eventApi.getEventWithCheckRoots({
			_id: comment.eventId,
		}, 'viewer')
		
		const buildEvent = eventApi.checkUserRootsAndBuild(
			event,
			'viewer',
			'response-item',
			'Недостаточно прав доступа для совершения этой операции.'
		)
		
		let updateObject: Record<string, any> = {}
		
		const isImportantCurrentState = !!comment.likedUsers?.find((item) => objectIdIsEquals(item, this.user._id))
		
		if (newState.state === 'toggle') {
			
			if (!isImportantCurrentState) {
				updateObject.$push = {
					likedUsers: this.user._id
				}
			} else {
				updateObject.$pull = {
					likedUsers: this.user._id
				}
			}
		}
		
		if (typeof newState.state === 'boolean') {
			
			if (isImportantCurrentState === newState.state) {
				throw new ResponseException(
					ResponseException.createSuccessObject({state: isImportantCurrentState})
				)
			}
			
			if (newState.state) {
				updateObject.$push = {
					likedUsers: this.user._id
				}
			} else {
				updateObject.$pull = {
					likedUsers: this.user._id
				}
			}
		}
		
		await Comment.updateOne({_id: comment._id}, updateObject)
	}
	
	private async updateCommentMessageAndSourceId(newState: UpdateCommentMessageState, comment: CommentModel): Promise<void> {
		return
	}
	
	public async updateCommentInfo(props: EditCommentRequestProps) {
		const comment: HydratedDocument<CommentModel> = await this.getCommentById(props.commentId)
		
		switch (props.fieldName) {
			case "isImportant":
				return await this.updateIsImportant(props, comment)
			case "content":
				return await this.updateCommentMessageAndSourceId(props, comment)
			default:
				throw new ResponseException(
					ResponseException.createObject(400, 'error', 'Неизвестный тип вносимых изменений')
				)
		}
	}
	
	
}