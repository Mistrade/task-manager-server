import {SessionHandler} from "../../../SessionRouter/SessionHandler";
import {UserModelResponse} from "../../../../common/transform/session/types";
import {Comment, CommentModel} from "../../../../mongo/models/Comment";
import {objectIdIsEquals} from "../../../../common/common";
import {EventModel, EventModelType} from "../../../../mongo/models/EventModel";
import {HydratedDocument, Schema} from "mongoose";
import {CommentResponseModel, CreateCommentProps} from "../types";
import {EventHelper} from "../../events/helpers/eventHelper";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {AccessRightsWithOwner} from "../../../../mongo/models/EventInvite";
import {DefaultEventItemResponse} from "../../info/types";

export class CommentsHelper {
	public user: UserModelResponse
	
	constructor(user?: UserModelResponse) {
		this.user = new SessionHandler(user).checkUser()
	}
	
	private validateMessage(message: string) {
		const length = message.length
		return length > 0 && length < 3000
	}
	
	private buildCommentItem(comment: CommentModel, buildEvent: DefaultEventItemResponse): CommentResponseModel {
		const isCommentCreator = objectIdIsEquals(comment.userId._id, this.user._id)
		
		return {
			date: comment.date,
			deletable: buildEvent.accessRights === 'owner' || isCommentCreator || false,
			editable: isCommentCreator,
			isImportant: false,
			eventId: comment._id,
			userId: comment.userId,
			message: comment.message,
			sourceComment: comment.sourceComment,
			_id: comment._id
		}
	}
	
	private canIDelete(comment: CommentModel, eventCreator: Schema.Types.ObjectId) {
		const isEventCreator = objectIdIsEquals(eventCreator, this.user._id)
		const isCommentCreator = objectIdIsEquals(comment.userId._id, this.user._id)
		
		return isEventCreator || isCommentCreator
	}
	
	public async getCommentById(id: Schema.Types.ObjectId, throwMessage?: string): Promise<HydratedDocument<CommentModel>> {
		const comment = await Comment.findById(id)
		
		if (!comment) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', throwMessage || 'Комментарий не найден')
			)
		}
		
		return comment
	}
	
	public async createComment(data: CreateCommentProps): Promise<HydratedDocument<CommentModel>> {
		const {message, sourceCommentId, eventId} = data
		
		const v = this.validateMessage(message)
		
		if (!v) {
			throw new ResponseException(
				ResponseException.createObject(400, 'warning', `Комментарий может быть 0 до 3000 символов`)
			)
		}
		
		const eventApi = new EventHelper(this.user)
		
		const event: HydratedDocument<EventModelType> | null = await eventApi.getEvent(
			{_id: eventId},
		)
		
		if (!event) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Не удалось найти событие')
			)
		}
		
		eventApi.checkUserRootsAndBuild(
			event,
			'editor',
			'none',
			'Недостаточно прав доступа для комментирования этого события'
		)
		
		let sourceComment: HydratedDocument<CommentModel> | null = null
		
		if (sourceCommentId) {
			sourceComment = await this.getCommentById(sourceCommentId, 'Не удалось найти комментарий, на который был написан ответ')
		}
		
		const createdComment: HydratedDocument<CommentModel> | null = await Comment.create({
			eventId: event._id,
			userId: this.user._id,
			sourceComment: sourceComment?.id || null,
			message
		})
		
		if (!createdComment) {
			throw new ResponseException(
				ResponseException.createObject(500, 'error', 'Не удалось создать комментарий')
			)
		}
		
		return createdComment
	}
	
	public async removeComment(commentId?: Schema.Types.ObjectId) {
		if (!commentId) {
			throw new ResponseException(
				ResponseException.createObject(400, 'error', 'На вход ожидался идентификатор комментария')
			)
		}
		
		const comment = await this.getCommentById(commentId, 'Комментарий не найден')
		
		const eventApi = new EventHelper(this.user)
		
		const event: HydratedDocument<EventModelType> | null = await eventApi.getEventWithCheckRoots(
			{_id: comment.eventId},
		)
		
		if (!event) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Событие не найдено')
			)
		}
		
		eventApi.checkUserRootsAndBuild(
			event,
			'editor',
			'response-item',
			'Недостаточно прав доступа для удаления этого комментария'
		)
		
		const deletable = this.canIDelete(comment, event.userId._id)
		
		if (!deletable) {
			throw new ResponseException(
				ResponseException.createObject(403, 'error', 'Вы не можете удалить этот комментарий')
			)
		}
		
		await Comment.deleteOne({
			eventId: event.id,
			_id: commentId,
		})
	}
	
	public async getCommentsByEventId(eventId: Schema.Types.ObjectId): Promise<Array<CommentResponseModel>> {
		if (!eventId) {
			throw new ResponseException(
				ResponseException.createObject(400, 'error', 'На вход ожидался id события')
			)
		}
		
		const eventApi = new EventHelper(this.user)
		
		const event = await eventApi.getEvent({_id: eventId})
		
		const buildEvent = eventApi.checkUserRootsAndBuild(
			event,
			'viewer',
			'response-item',
			'Недостаточно прав доступа для просмотра комментариев этого события'
		)
		
		const comments: Array<HydratedDocument<CommentModel>> | null = await Comment.find({eventId}, {}, {sort: {date: -1}})
		
		if (!comments) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Комментарии не найдены')
			)
		}
		
		return comments.map((item) => this.buildCommentItem(item, buildEvent))
	}
	
	public async removeCommentsByEventId(eventId: Schema.Types.ObjectId | Array<Schema.Types.ObjectId>, disableCheckRoots: boolean = false): Promise<boolean> {
		if (!eventId || (Array.isArray(eventId) && eventId?.length === 0)) {
			console.log('cекция 1')
			return false
		}
		
		let resultEventId = eventId
		
		if (!disableCheckRoots) {
			const eventApi = new EventHelper(this.user)
			const rootsFilter = eventApi.buildMinimalRootsFilter('owner')
			const eventList: Array<HydratedDocument<EventModelType>> | null = await EventModel.find({
				_id: Array.isArray(eventId) ? {$in: eventId} : eventId,
				...rootsFilter
			})
			
			if (!eventList || !eventList.length) {
				console.log('секция 2')
				return false
			}
			
			resultEventId = eventList.map(Item => Item._id)
		}
		
		await Comment.deleteMany({
			eventId: {
				$in: resultEventId
			}
		})
		
		console.log('секция 3: ', JSON.stringify(resultEventId))
		return true
	}
}