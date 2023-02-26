import express from "express";
import {
	CalendarPriorityKeys,
	EventLinkItem,
	EventModel,
	EventModelType,
	EventModelWithPopulatedChains,
	TaskStatusesType
} from "../../mongo/models/EventModel";
import {AuthMiddleware} from "../../middlewares/auth.middleware";
import dayjs, {Dayjs} from "dayjs";
import {HydratedDocument, Schema} from "mongoose";
import {
	eventSnapshot,
	getTaskStorage,
	objectIdInArrayOfAnotherObjectId,
	objectIdIsEquals,
	TaskStorage,
	UpdateTaskDescription,
	UpdateTaskInfo,
	utcDate
} from "../../common/common";
import {AddChainsType, EventChainsObject, RequestCommentAddProps} from "./types";
import {
	colorRegExpDefault,
	colorRegExpRGBA,
	TaskFilteredStatusesObject,
	TaskStatusesObject
} from "../../common/constants";
import {GroupModel, GroupsModelType} from "../../mongo/models/Group";
import {FullResponseEventModel, ShortEventItemResponse} from "../../common/transform/events/types";
import {EventTransformer, transformEventSnapshot} from "../../common/transform/events/events";
import {
	createEventHistoryNote,
	EventHistory,
	EventHistoryResponseItem,
	PopulatedEventHistoryDb
} from "../../mongo/models/EventHistory";
import {Comment, CommentModel, CommentSchemaType} from "../../mongo/models/Comment";
import {getChainsCount, getCommentsCount, getHistoryItemsCount} from "./EventRouterHelpers";
import {EventChainsHelper} from "./chains/helpers/EventChainsHelper";
import {UserModelResponse} from "../../common/transform/session/types";
import {CatchErrorHandler, ResponseException} from "../../exceptions/ResponseException";
import {HistoryHelper} from "./history/helper/historyHelper";
import {EventsRouter} from "./events";
import {UpdateEventMapTypes} from "./info/types";

const route = express.Router()

export interface AuthRequest<Data extends any = any, Params = any> extends express.Request<Params, any, Data> {
	user?: UserModelResponse
}

export type FilterTaskStatuses = 'in_work' | 'completed' | 'archive' | 'created' | 'all'

export type ErrorTypes = 'info' | 'success' | 'warning' | 'error' | 'default'

export interface CustomResponseBody<T> {
	data: T | null,
	info?: {
		message: string,
		type: ErrorTypes
	}
}

export interface ResponseReturned<T extends any = any> {
	status: number,
	json: T
}

export type EventModelFilters = Partial<{ [key in keyof EventModelType | string]: any }>

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
	async updateTaskInfo(req: AuthRequest<UpdateEventMapTypes>, res: express.Response<CustomResponseBody<null>>) {
		try {
			
			const {user, body} = req
			
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
			
			const hasData = !!body.data || body.data === null || body.data === false
			
			if (!hasData) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Данные для обновления не были получены',
						type: 'error'
					}
				})
			}
			
			const task: EventModelType | null = await EventModel.findOne({
				_id: body.id
			})
			
			if (!task) {
				return res.status(404).json({
					data: null,
					info: {
						message: 'Неверный идентификатор события',
						type: 'error'
					}
				})
			}
			
			if (!objectIdIsEquals(user._id, task.userId._id)) {
				return res.status(403).json({
					data: null,
					info: {
						message: "Вы не можете вносить правки в это событие",
						type: "error"
					}
				})
			}
			
			const newTaskInfo = UpdateTaskInfo(task, body, user)
			
			if (typeof newTaskInfo === 'string') {
				return res.status(400).json({
					data: null,
					info: {
						message: newTaskInfo,
						type: 'error'
					}
				})
			}
			
			await EventModel.updateOne({_id: task._id}, newTaskInfo)
			
			const updated: EventModelType | null = await EventModel.findOne({
				_id: task._id
			})
			
			if (updated) {
				// await EventHistory.create(
				// 	createEventHistoryNote({
				// 		date: utcDate(),
				// 		eventId: updated._id,
				// 		fieldName: body.field,
				// 		changeUserId: user._id,
				// 		snapshotDescription: UpdateTaskDescription[body.field],
				// 		eventSnapshot: eventSnapshot(updated, utcDate())
				// 	})
				// )
			}
			
			return res.status(200).json({
				data: null,
				info: {
					message: 'Успешно обновлено',
					type: 'success'
				}
			})
		} catch (e) {
			return res.status(200).json({
				data: null,
				info: {
					message: 'Произошла непредвиденная ошибка сервера',
					type: 'error'
				}
			})
		}
	},
	async getCalendarsList(req: AuthRequest<{ exclude?: Array<GroupsModelType['type']> }>, res: express.Response<CustomResponseBody<Array<GroupsModelType>>>) {
		try {
			
			const {user, body} = req
			
			if (!user) {
				return res.status(403).json({
					data: null,
					info: {
						message: 'Пользователь не найден',
						type: 'error'
					}
				})
			}
			
			const {_id} = user
			
			const list: Array<GroupsModelType> | null = await GroupModel.find({
				userId: _id,
				type: {
					$nin: body.exclude || []
				}
			})
			
			if (!list) {
				return res.status(404).json({
					data: null,
					info: {
						message: 'Календари пользователя не найдены',
						type: 'warning'
					}
				})
			}
			
			return res.status(200).json({
				data: list,
			})
		} catch (e) {
			return res.status(500).json({
				data: null,
				info: {
					message: 'Произошла непредвиденная ошибка сервера',
					type: 'error'
				}
			})
		}
	},
	async changeCalendarSelect(req: AuthRequest<{ id: string, state: boolean }>, res: express.Response<CustomResponseBody<null>>) {
		try {
			
			const {user, body: {id, state}} = req
			
			if (!user) {
				return res.status(403).json({
					data: null,
					info: {
						message: 'Пользователь не найден',
						type: 'error'
					}
				})
			}
			
			await GroupModel.updateOne<GroupsModelType>({
				_id: id,
				userId: user._id
			}, {
				isSelected: state
			})
			
			return res.status(200).json({
				data: null,
				info: {
					message: 'Успешно обновлено',
					type: 'success'
				}
			})
			
		} catch (e) {
			return res.status(500).json({
				data: null,
				info: {
					message: 'Произошла непредвиденная ошибка сервера',
					type: 'error'
				}
			})
		}
		
	},
	async createCalendar(req: AuthRequest<{ title: string, color: string, id: string }>, res: express.Response<CustomResponseBody<null>>) {
		try {
			const {user, body} = req
			
			if (!user) {
				return res.status(403).json({
					data: null,
					info: {
						message: 'Пользователь не найден',
						type: 'error'
					}
				})
			}
			
			const {title, color} = body
			
			if (!title || !color) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Отсутствуют входные параметры',
						type: 'error'
					}
				})
			}
			
			const resultTitle = title.trim()
			const isValidTitle = resultTitle.length >= 5 && resultTitle.length <= 20
			
			if (!isValidTitle) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Заголовок должен быть от 5 до 20 символов',
						type: 'warning'
					}
				})
			}
			
			const resultColor = color.trim()
			const isValidColor = colorRegExpRGBA.test(resultColor) || colorRegExpDefault.test(resultColor)
			
			if (!isValidColor) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Цвет должен быть в формате HEX или RGB/RGBA',
						type: 'warning'
					}
				})
			}
			
			const calendar = await GroupModel.create({
				title: resultTitle,
				color: resultColor,
				editable: true,
				deletable: true,
				isSelected: true,
				type: 'Custom',
				userId: user._id,
			})
			
			if (!calendar) {
				return res.status(500).json({
					data: null,
					info: {
						message: 'Извините, нам не удалось создать календарь, попробуйте еще раз',
						type: 'error'
					}
				})
			}
			
			return res.status(200).json({
				data: null,
				info: {
					message: 'Календарь успешщно создан',
					type: 'success'
				}
			})
			
		} catch (e) {
			return res.status(500).json({
				data: null,
				info: {
					message: 'Календарь не был создан, так как произошла непредвиденная ошибка на сервере',
					type: 'error'
				}
			})
		}
	},
	async removeCalendar(req: AuthRequest<{ id: string }>, res: express.Response<CustomResponseBody<null>>) {
		try {
			
			const {user} = req
			
			if (!user) {
				return res.status(403).json({
					data: null,
					info: {
						type: 'error',
						message: 'У вас нет прав для совершения этого действия'
					}
				})
			}
			
			const calendar = await GroupModel.findOneAndDelete({
				_id: req.body.id,
				userId: user._id,
				deletable: true
			})
			
			if (calendar) {
				const events: Array<EventModelType> | null = await EventModel.find({
					calendar: req.body.id,
				})
				
				if (events) {
					const eventsId = events.map((event) => event._id)
					
					await Comment.deleteMany({
						eventId: {
							$in: eventsId
						}
					})
					
					await EventHistory.deleteMany({
						eventId: {
							$in: eventsId
						}
					})
				}
				
				await EventModel.deleteMany({
					calendar: req.body.id,
				})
				
				return res.status(200).json({
					data: null,
					info: {
						type: 'success',
						message: 'Календарь и события успешно удалены'
					}
				})
			}
			
			return res.status(404).json({
				data: null,
				info: {
					type: 'warning',
					message: 'Календарь, который можно удалить не найден'
				}
			})
		} catch (e) {
			
		}
	},
	async getCalendarInfo(req: AuthRequest<any, { calendarId: string }>, res: express.Response<CustomResponseBody<GroupsModelType>>) {
		try {
			
			const {user} = req
			
			
			if (!user) {
				return res.status(403).json({
					data: null,
					info: {
						type: 'error',
						message: 'У вас нет прав для совершения этого действия'
					}
				})
			}
			
			const {calendarId} = req.params
			
			if (!calendarId) {
				return res.status(400).json({
					data: null,
					info: {
						type: 'error',
						message: 'Некорректный запрос'
					}
				})
			}
			
			const calendarInfo: GroupsModelType | null = await GroupModel.findOne({
				userId: user._id,
				_id: calendarId,
				editable: true,
			})
			
			if (!calendarInfo) {
				return res.status(404).json({
					data: null,
					info: {
						type: 'error',
						message: 'Запрашиваемый календарь не найден'
					}
				})
			}
			
			return res.status(200).json({
				data: calendarInfo,
			})
			
		} catch (e) {
			console.log(e)
			return res.status(500).json({
				data: null,
				info: {
					type: 'error',
					message: 'Произошла непредвиденная ошибка на сервере'
				}
			})
		}
	},
	async updateCalendarInfo(req: AuthRequest<{ title: string, color: string, id: string }>, res: express.Response) {
		try {
			const {user, body} = req
			
			if (!user) {
				return res.status(403).json({
					data: null,
					info: {
						message: 'Пользователь не найден',
						type: 'error'
					}
				})
			}
			
			const {title, color, id} = body
			
			if (!title || !color || !id) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Отсутствуют входные параметры',
						type: 'error'
					}
				})
			}
			
			const calendar: GroupsModelType | null = await GroupModel.findOne({
				_id: id,
				userId: user._id,
				editable: true,
			})
			
			if (!calendar) {
				return res
					.status(404)
					.json({
						data: null,
						info: {
							type: 'error',
							message: 'Не удалось изменить календарь, так как он не найден'
						}
					})
			}
			if (calendar.title === title && calendar.color === color) {
				return res.status(200).json({
					data: null,
					info: {
						type: 'info',
						message: 'Изменений не выявлено'
					}
				})
			}
			
			const resTitle = title.trim()
			const isValidTitle = resTitle.length >= 5 && resTitle.length <= 20
			
			if (!isValidTitle) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Заголовок должен быть от 5 до 20 символов',
						type: 'warning'
					}
				})
			}
			
			const resultColor = color.trim()
			const isValidColor = colorRegExpRGBA.test(resultColor) || colorRegExpDefault.test(resultColor)
			
			if (!isValidColor) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Цвет должен быть в формате HEX или RGB/RGBA',
						type: 'warning'
					}
				})
			}
			
			await GroupModel.updateOne({
				userId: user._id,
				_id: id,
				editable: true,
			}, {
				title,
				color
			})
			
			return res.status(200)
				.json({
					data: null,
					info: {
						type: 'success',
						message: 'Успешно обновлено'
					}
				})
			
		} catch (e) {
			console.log(e)
			return res.status(500).json({
				data: null,
				info: {
					type: 'error',
					message: 'Произошла непредвиденная ошибка на сервере'
				}
			})
		}
	},
	async getEventHistory(req: AuthRequest<string, { taskId: string }>, res: express.Response<CustomResponseBody<Array<EventHistoryResponseItem>>>) {
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
			
			const historyListFromDb: Array<HydratedDocument<PopulatedEventHistoryDb>> | null = await EventHistory.find(
				{eventId: params.taskId},
				{},
				{sort: {date: -1}}
			).populate({
				path: 'eventSnapshot',
				populate: [
					// {path: 'childOf', populate: "event"},
					'parentId',
					"linkedFrom"
				]
			})
			
			if (!historyListFromDb) {
				return res.status(404).json({
					data: null,
					info: {type: "warning", message: "Не удалось найти историю события"}
				})
			}
			
			return res
				.status(200)
				.json({
					data: historyListFromDb.map((item) => ({
						date: item.date,
						changeUserId: item.changeUserId,
						fieldName: item.fieldName,
						snapshotDescription: item.snapshotDescription,
						eventId: item.eventId,
						eventSnapshot: transformEventSnapshot(item.eventSnapshot)
					}))
				})
			
		} catch (e) {
			console.log('произошла ошибка', e)
			return res
				.status(500)
				.json({
					data: null,
					info: {
						message: 'Не удалось получить историю события',
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


// route.post('/history/add', async (req: AuthRequest, res) => {
// 	try {
// 		const _ = new HistoryHelper(req.user)
//
// 		const event: HydratedDocument<EventModelType> | null = await EventModel.findOne({
// 			_id: "63f1db022a300fa87d3d576c"
// 		})
//
// 		if (!event) {
// 			throw new ResponseException(
// 				ResponseException.createObject(400, 'error', 'событие не найдено')
// 			)
// 		}
//
// 		// const data = await _.addToHistory(
// 		// 	[
// 		// 		{
// 		// 			eventId: event._id,
// 		// 			fieldName: "title",
// 		// 			snapshotDescription: "Изменен заголовок",
// 		// 			eventSnapshot: {
// 		// 				title: "2222",
// 		// 				priority: event.priority,
// 		// 				status: event.status,
// 		// 				createdAt: event.createdAt,
// 		// 				originalEventId: event._id,
// 		// 				user: _.user._id
// 		// 			}
// 		// 		},
// 		// 		{
// 		// 			eventId: event._id,
// 		// 			fieldName: "time",
// 		// 			snapshotDescription: "Изменен приоритет",
// 		// 			eventSnapshot: {
// 		// 				title: "2222",
// 		// 				priority: event.priority,
// 		// 				status: event.status,
// 		// 				createdAt: event.createdAt,
// 		// 				originalEventId: event._id,
// 		// 				user: _.user._id,
// 		// 				time: new Date()
// 		// 			}
// 		// 		}
// 		// 	]
// 		// )
//
// 		//RESULT
// 		//историю можно писать, получать, удалять для этого есть готовые методы
//
//
// 		// const result = await _.getHistoryListByEventId(event._id)
//
// 		return res.status(200).json(result)
// 	} catch (e) {
// 		return CatchErrorHandler(e)
// 	}
// })
//
//
// route.get('/history/:eventId', async (req: AuthRequest, res) => {
// 	try {
// 		const _ = new HistoryHelper(req.user)
// 		const data = await _.getHistoryListByEventId(req.params.eventId)
//
// 		return res.status(200).json(data.result)
//
// 	} catch (e) {
// 		return CatchErrorHandler(e)
// 	}
// })






export const PlanningRouter = route