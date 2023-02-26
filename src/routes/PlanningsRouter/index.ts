import express from "express";
import {EventModel, EventModelType, EventModelWithPopulatedChains} from "../../mongo/models/EventModel";
import {AuthMiddleware} from "../../middlewares/auth.middleware";
import {objectIdIsEquals} from "../../common/common";
import {AddChainsType, AuthRequest, CustomResponseBody, EventChainsObject, RequestCommentAddProps} from "./types";
import {EventTransformer} from "../../common/transform/events/events";
import {Comment, CommentModel, CommentSchemaType} from "../../mongo/models/Comment";
import {EventChainsHelper} from "./chains/helpers/EventChainsHelper";
import {EventsRouter} from "./events";

const route = express.Router()

export const handlers = {
	async getEventChains(req: AuthRequest<string, { taskId: string }>, res: express.Response<CustomResponseBody<EventChainsObject>>) {
		try {
			const {user, params} = req
			
			if (!user) {
				return res
					.status(403)
					.json({
						data: null,
						info: {
							message: 'Пользователь не найден',
							type: 'error'
						}
					})
			}
			
			console.log(user, params)
			
			if (!params.taskId) {
				return res
					.status(400)
					.json({
						data: null,
						info: {
							message: 'На вход ожидался ID события',
							type: 'error'
						}
					})
			}
			
			const taskInfo: EventModelWithPopulatedChains | null = await EventModel.findOne({
				_id: params.taskId
			})
				.populate([
					// {path: 'childOf', populate: "event"},
					'parentId',
					"linkedFrom"
				])
			
			if (!taskInfo) {
				return res
					.status(404)
					.json({
						data: null,
						info: {
							message: 'Событие не найдено',
							type: 'warning'
						}
					})
			}
			
			return res
				.status(200)
				.json({
					data: {
						childrenEvents:  null,
						parentEvent: taskInfo.parentId ? EventTransformer.eventItemResponse(taskInfo.parentId) : null,
						linkedFromEvent: taskInfo.linkedFrom ? EventTransformer.eventItemResponse(taskInfo.linkedFrom) : null
					}
				})
			
		} catch (e) {
			console.error(e)
			return res
				.status(500)
				.json({
					data: null,
					info: {
						message: 'Произошла непредвиденная ошибка',
						type: 'error'
					}
				})
		}
	},
	async getEventCommentList(req: AuthRequest<null, { taskId?: string }>, res: express.Response<CustomResponseBody<Array<CommentModel>>>) {
		try {
			const {user, params} = req
			
			if (!user) {
				return res
					.status(403)
					.json({
						data: null,
						info: {
							message: 'Не удалось проверить сессию текущего пользователя',
							type: 'error'
						}
					})
			}
			
			const {taskId} = params
			
			if (!taskId) {
				return res
					.status(400)
					.json({
						data: null,
						info: {
							type: "warning",
							message: "TaskId is undefined or not correct"
						}
					})
			}
			
			const task: EventModelType | null = await EventModel.findOne({
				_id: taskId
			})
			
			
			if (!task) {
				return res
					.status(404)
					.json({
						data: null,
						info: {type: "error", message: "Событие не найдено"}
					})
			}
			
			if (
				!objectIdIsEquals(user._id, task.userId._id)
				// && !objectIdInArrayOfAnotherObjectId(user._id, task.members)
			) {
				return res
					.status(403)
					.json({
						data: null,
						info: {type: "error", message: "Вы не можете просматривать комментарии к этому событию"}
					})
			}
			
			const comments: Array<CommentModel> | null = await Comment.find(
				{eventId: taskId},
				{},
				{sort: {date: -1}}
			)
			
			if (!comments) {
				return res
					.status(500)
					.json({
						data: null,
						info: {type: 'info', message: "Комментарии не найдены"}
					})
			}
			
			return res.status(200).json({
				data: comments,
			})
			
		} catch (e) {
			console.error(e)
			return res
				.status(500)
				.json({
					data: null,
					info: {
						message: 'Произошла ошибка, мы уже работаем над этим',
						type: 'error'
					}
				})
		}
		
	},
	async addEventComment(req: AuthRequest<RequestCommentAddProps>, res: express.Response<CustomResponseBody<null>>) {
		try {
			const {user, body} = req
			
			if (!user) {
				return res
					.status(403)
					.json({
						data: null,
						info: {
							message: 'Не удалось проверить сессию текущего пользователя',
							type: 'error'
						}
					})
			}
			
			
			const {eventId, message, sourceCommentId} = body
			
			const event: EventModelType | null = await EventModel.findOne({
				_id: eventId
			})
			
			if (!event) {
				return res.status(404).json({
					data: null,
					info: {
						type: "error",
						message: "Комментарий не был сохранен, так как событие не найдено, попробуйте еще раз."
					}
				})
			}
			
			if (
				!objectIdIsEquals(user._id, event.userId._id)
				// && !objectIdInArrayOfAnotherObjectId(user._id, event.members)
			) {
				return res.status(403).json({
					data: null,
					info: {
						type: 'error',
						message: "Вы не можете комментировать это событие"
					}
				})
			}
			
			await Comment.create<CommentSchemaType>({
				message,
				userId: user._id,
				eventId,
				sourceComment: sourceCommentId || null,
			})
			
			return res.status(200).json({data: null})
			
		} catch (e) {
			return res
				.status(500)
				.json({
					data: null,
					info: {
						message: 'Не удалось сохранить комментарий',
						type: 'error'
					}
				})
		}
	},
	async removeEventComment(req: AuthRequest<{ commentId?: string }, null>, res: express.Response<CustomResponseBody<null>>) {
		try {
			
			const {user, body} = req
			
			
			if (!user) {
				return res
					.status(403)
					.json({
						data: null,
						info: {type: 'error', message: "Не удалось проверить сессию текущего пользователя"}
					})
			}
			
			const {commentId} = body
			
			if (!commentId) {
				return res.status(400).json({
					data: null,
					info: {type: 'error', message: "Недостаточно данных для совершения действия"}
				})
			}
			
			const comment: CommentModel | null = await Comment.findOne({
				_id: commentId,
			})
			
			if (!comment) {
				return res.status(404).json({
					data: null,
					info: {type: "warning", message: "Комментарий не найден"}
				})
			}
			
			const event: EventModelType | null = await EventModel.findOne({
				_id: comment.eventId
			})
			
			if (!event) {
				return res.status(404).json({
					data: null,
					info: {type: 'warning', message: "Событие не найдено"}
				})
			}
			
			const canIDelete = ((): boolean => {
				const isCreator = objectIdIsEquals(event.userId._id, user._id)
				
				if (isCreator) return true
				
				const isMyComment = objectIdIsEquals(user._id, comment.userId._id)
				
				if (isMyComment) return true
				
				return false
			})()
			
			
			if (!canIDelete) {
				return res.status(403).json({
					data: null,
					info: {type: 'error', message: "Вы не можете удалить этот комментарий"}
				})
			}
			
			await Comment.deleteOne({
				_id: commentId
			})
			
			return res.status(200).json({
				data: null,
				info: {type: "success", message: "Комментарий успешно удален"}
			})
			
		} catch (e) {
			console.error(e)
			return res.status(500).json({
				data: null,
				info: {type: "error", message: "Не удалось удалить комментарий"}
			})
		}
	},
	async addEventChains(req: AuthRequest<AddChainsType>, res: express.Response<CustomResponseBody<null>>) {
		try {
			const {user, body} = req
			
			if (body.chainType === "childOf") {
				const _ = new EventChainsHelper(user)
				const result = await _.pushChildOf(body)
				return res.status(result.status).json(result.json)
			}
			
			if (body.chainType === "parentId") {
				const result = {
					status: 200,
					json: {
						data: null,
					}
				}
				return res.status(result.status).json(result.json)
			}
			
			return res.status(400).json({
				data: null,
				info: {
					type: "error",
					message: "Неизвестный тип связи"
				}
			})
			
			
		} catch (e) {
			console.error(e)
			return res.status(500).json({
				data: null,
				info: {type: "error", message: "Не удалось создать связи"}
			})
		}
	}
}

route.use(AuthMiddleware)
route.use('/events', EventsRouter)

export const PlanningRouter = route