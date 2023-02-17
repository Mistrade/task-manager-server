import express from "express";
import {
	CalendarPriorityKeys,
	Event,
	EventLinkItem,
	EventModel,
	EventModelWithPopulateChildOf,
	TaskStatusesType
} from "../../mongo/models/EventModel";
import {UserModel} from "../../mongo/models/User";
import {AuthMiddleware} from "../../middlewares/auth.middleware";
import dayjs from "dayjs";
import {Schema} from "mongoose";
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
import {EventChainsObject, RequestCommentAddProps, UpdateTaskTypes} from "./types";
import {
	colorRegExpDefault,
	colorRegExpRGBA,
	TaskFilteredStatusesObject,
	TaskStatusesObject
} from "../../common/constants";
import {Calendars, CalendarsModel} from "../../mongo/models/Calendars";
import {FullResponseEventModel, ShortEventItemResponse} from "../../common/transform/events/types";
import {EventTransformer} from "../../common/transform/events/events";
import {
	createEventHistoryNote,
	EventHistory,
	EventHistoryPopulatedItem,
	EventHistoryResponseItem
} from "../../mongo/models/EventHistory";
import {Comment, CommentModel, CommentSchemaType} from "../../mongo/models/Comment";
import {getChainsCount, getCommentsCount, getHistoryItemsCount} from "./EventRouterHelpers";

const route = express.Router()


interface RequestTaskBody {
	title: string,
	type: 'event',
	status: TaskStatusesType,
	priority: CalendarPriorityKeys,
	time: string,
	timeEnd: string,
	link: EventLinkItem | null,
	description?: string,
	calendar: Schema.Types.ObjectId,
	linkedFrom?: Schema.Types.ObjectId,
	parentId?: Schema.Types.ObjectId
}

export interface AuthRequest<Data extends any = any, Params = any> extends express.Request<Params, any, Data> {
	user?: UserModel
}

export type FilterTaskStatuses = 'in_work' | 'completed' | 'archive' | 'created' | 'all'

interface GetTaskAtDayInputValues {
	fromDate: string,
	toDate: string,
	title: string | null,
	priority: CalendarPriorityKeys | null,
	taskStatus: FilterTaskStatuses,
	onlyFavorites?: boolean,
	utcOffset: number,
}

interface GetTaskSchemeInputProps {
	fromDate: string,
	toDate: string
}

type ErrorTypes = 'info' | 'success' | 'warning' | 'error' | 'default'

export interface CustomResponseBody<T> {
	data: T | null,
	info?: {
		message: string,
		type: ErrorTypes
	}
}

type GetTaskSchemeResult = {
	[key: string]: boolean | undefined
}

interface GetTaskFiltersErrorReturned {
	status: number,
	json: any
}

type GetTaskFiltersScopeReturned = Partial<{ [key in keyof EventModel]: any }>
type GetTaskDateFiltersReturnedQuery = { [key in string]: any }
type GetTaskDateFiltersReturned = {
	startDate: Date,
	endDate: Date,
	filter: GetTaskDateFiltersReturnedQuery
}

export const getTaskDateFilters = (fromDate: string | Date | undefined, toDate: string | Date | undefined): GetTaskFiltersErrorReturned | GetTaskDateFiltersReturned => {
	const startDate = dayjs(fromDate)
	
	if (!startDate.isValid()) {
		return {
			status: 400,
			json: []
		}
	}
	
	const endDate = dayjs(toDate)
	
	if (!endDate.isValid()) {
		return {
			status: 400,
			json: []
		}
	}
	
	return {
		startDate: startDate.toDate(),
		endDate: endDate.toDate(),
		filter: {
			$or: [
				{
					//Кейс когда событие начинается и завершается между startDate и endDate
					time: {
						$gte: utcDate(startDate),
						$lte: utcDate(endDate)
					},
					timeEnd: {
						$gte: utcDate(startDate),
						$lte: utcDate(endDate)
					}
				},
				{
					//Кейс когда событие начинается раньше startDate и заканчивается позже endDate
					time: {
						$lte: utcDate(startDate)
					},
					timeEnd: {
						$gte: utcDate(endDate)
					}
				},
				{
					//Кейс когда событие начинается раньше startDate, а заканчивается между startDate и andDate
					time: {
						$lte: utcDate(startDate)
					},
					timeEnd: {
						$gte: utcDate(startDate),
						$lte: utcDate(endDate)
					}
				},
				{
					//Кейс когда событие начинается между startDate и endDate, а заканчивается позже endDate
					time: {
						$gte: utcDate(startDate),
						$lte: utcDate(endDate)
					},
					timeEnd: {
						$gte: utcDate(endDate)
					}
				}
			],
		}
	}
}


export const getTaskFiltersOfScope = async (res: express.Response, user: UserModel, options: Partial<GetTaskAtDayInputValues>): Promise<GetTaskFiltersErrorReturned | GetTaskFiltersScopeReturned> => {
	const {fromDate, toDate, title, priority, taskStatus, onlyFavorites} = options
	
	const dateFilter = getTaskDateFilters(fromDate, toDate)
	
	if ('status' in dateFilter) {
		return dateFilter
	}
	
	const calendars: Array<CalendarsModel> = await Calendars.find({
		userId: user._id,
		isSelected: true,
	})
	
	const filter: Partial<{ [key in keyof EventModel]: any }> = {
		...dateFilter.filter,
		userId: user._id,
		calendar: {
			$in: calendars.map((item) => item._id)
		}
	}
	
	if (onlyFavorites) {
		filter.isLiked = onlyFavorites
	}
	
	if (taskStatus) {
		filter.status = {
			$in: TaskStatusesObject[taskStatus || 'in_work']
		}
	}
	
	if (title) {
		filter.title = {
			$regex: `${title}`,
			$options: 'i'
		}
	}
	
	if (priority && priority !== 'not_selected') {
		filter.priority = {
			$eq: priority
		}
	}
	
	return filter
}


export const handlers = {
	async addEvent(req: AuthRequest<RequestTaskBody>, res: express.Response<CustomResponseBody<{ taskId: Schema.Types.ObjectId }>>) {
		try {
			const {user} = req
			
			if (!user) {
				return res.status(404).json({
					data: null,
					info: {
						type: 'error',
						message: 'Произошла ошибка сохранения события.'
					}
				})
			}
			
			const {
				title,
				status,
				priority,
				time,
				timeEnd,
				type,
				link,
				description,
				calendar,
				linkedFrom,
				parentId
			} = req.body
			
			const startTime = dayjs(time)
			
			if (!startTime.isValid()) {
				return res.status(400).json({
					data: null,
					info: {
						type: 'error',
						message: 'Невалидная дата начала события'
					}
				})
			}
			
			const endTime = dayjs(timeEnd)
			
			if (!endTime.isValid()) {
				return res.status(400).json({
					data: null,
					info: {
						type: 'error',
						message: 'Невалидная дата завершения события'
					}
				})
			}
			
			let resultCalendar: Schema.Types.ObjectId = calendar
			
			if (!resultCalendar) {
				const MainCalendar = await Calendars.findOne({
					type: 'Main',
					userId: user._id
				})
				
				if (!MainCalendar) {
					return res.status(404).json({
						data: null,
						info: {
							message: 'Не удалось найти календарь',
							type: 'error'
						}
					})
				}
				
				resultCalendar = MainCalendar._id
			}
			
			const lastChange = utcDate()
			
			const createdEvent: EventModel = await Event.create({
				linkedFrom: linkedFrom || undefined,
				parentId: parentId || undefined,
				calendar: resultCalendar,
				title,
				status,
				priority,
				createdAt: lastChange,
				time: utcDate(startTime),
				timeEnd: utcDate(endTime),
				type,
				link,
				userId: user._id,
				description: description || '',
				members: [],
				lastChange: lastChange,
			})
			
			if (createdEvent._id) {
				await EventHistory.create(
					createEventHistoryNote({
						eventId: createdEvent._id,
						eventSnapshot: eventSnapshot(createdEvent, lastChange),
						date: lastChange,
						fieldName: 'createdAt',
						changeUserId: user._id,
						snapshotDescription: "Событие создано"
					})
				)
			}
			
			if (parentId && createdEvent._id) {
				await Event.updateOne<EventModel>(
					{_id: parentId},
					{$push: {childOf: createdEvent._id}}
				)
				
				const parentEvent: EventModel | null = await Event.findOne({
					_id: parentId
				})
				
				if (parentEvent) {
					await EventHistory.create(
						createEventHistoryNote({
							eventId: parentEvent._id,
							eventSnapshot: eventSnapshot(parentEvent, lastChange),
							date: utcDate(),
							fieldName: 'childOf',
							changeUserId: user._id,
							snapshotDescription: "Добавлено вложенное событие"
						})
					)
				}
			}
			
			
			return res.status(200).json({
				data: {
					taskId: createdEvent._id,
				},
				info: {
					type: 'success',
					message: 'Событие успешно создано'
				},
			})
		} catch (e) {
			console.log(req.url, e)
			return res.status(500).json({
				data: null,
				info: {
					type: 'error',
					message: 'Не удалось сохранить событие'
				}
			})
		}
	},
	async getTaskAtScope(req: AuthRequest<GetTaskAtDayInputValues>, res: express.Response<TaskStorage>) {
		try {
			const {user} = req
			
			if (!user) {
				return res
					.status(403)
					.json({})
			}
			
			const filter = await getTaskFiltersOfScope(res, user, req.body)
			
			if ('json' in filter) {
				return res
					.status(filter.status)
					.json(filter.json)
			}
			
			const eventsFromDB: Array<EventModel> | null = await Event.find(filter, {}, {
				sort: {time: 1},
				populate: [
					{path: 'calendar'}
				],
			})
			
			if (!eventsFromDB) {
				return res
					.status(404)
					.json({})
			}
			
			const shortEvents = eventsFromDB.map((item) => EventTransformer.shortEventItemResponse(item))
			
			const storage = getTaskStorage(shortEvents, req.body.utcOffset)
			
			return res
				.status(200)
				.json(storage)
			
			
		} catch (e) {
			console.log(e)
			return res
				.status(500)
				.json({})
		}
	},
	async getTaskAtDay(req: AuthRequest<GetTaskAtDayInputValues>, res: express.Response<Array<ShortEventItemResponse>>) {
		try {
			const {user} = req
			
			if (!user) {
				return res
					.status(403)
					.json([])
			}
			
			const filter = await getTaskFiltersOfScope(res, user, req.body)
			
			if ('json' in filter) {
				return res
					.status(filter.status)
					.json(filter.json)
			}
			
			const eventsFromDB: Array<EventModel> | null = await Event.find(filter,
				{},
				{
					sort: {time: 1},
					populate: [
						{path: 'calendar'}
					],
				})
			
			if (eventsFromDB) {
				return res
					.status(200)
					.json(eventsFromDB.map(EventTransformer.shortEventItemResponse))
			}
			
			return res
				.status(404)
				.json([])
			
		} catch (e) {
			return res
				.status(500)
				.json([])
		}
	},
	async getTaskCountOfStatus(req: AuthRequest<Omit<GetTaskAtDayInputValues, 'taskStatus'>>, res: express.Response<{ [key in FilterTaskStatuses]?: number }>) {
		try {
			const {user} = req
			
			if (!user) {
				return res.status(403).json({})
			}
			
			const filters = await getTaskFiltersOfScope(res, user, req.body)
			
			const events: null | Array<EventModel> = await Event.find(filters)
			
			if (!events) {
				return res.status(200).json({})
			}
			
			const responseTemplate: { [key in FilterTaskStatuses]: number } = {
				archive: 0,
				created: 0,
				completed: 0,
				in_work: 0,
				all: 0
			}
			
			events.forEach((item) => {
				const s: Array<FilterTaskStatuses> = TaskFilteredStatusesObject[item.status]
				if (s) {
					s.forEach((filterStatus) => {
						responseTemplate[filterStatus]++
					})
				}
			})
			
			return res.status(200).json(responseTemplate)
			
		} catch (e) {
			console.log(e)
			return res.status(500).json({})
		}
	},
	async removeTask(req: AuthRequest<{ id: string, remove?: boolean }>, res: express.Response) {
		try {
			const {user, body} = req
			
			if (!user) {
				return res
					.status(403)
					.json({
						message: 'Пользователь не найден'
					})
			}
			
			const {id: taskId} = body
			
			const event: EventModel | null = await Event.findOne({
				_id: taskId
			})
			
			if (!event) {
				return res.status(404).json({
					message: 'Событие не найдено'
				})
			}
			
			if (!objectIdIsEquals(user._id, event.userId._id)) {
				return res.status(403).json({
					data: null,
					info: {
						type: 'error',
						message: "Удалить событие или перенести его в архив может только создатель события"
					}
				})
			}
			
			if (event.status !== 'archive' && !body.remove) {
				await Event.updateOne({
					_id: taskId
				}, {
					status: 'archive'
				})
				
				return res.status(200).json({
					message: 'Событие перенесено в архив'
				})
			}
			
			await Event.deleteOne({
				_id: taskId
			})
			
			await EventHistory.deleteMany({
				eventId: taskId
			})
			
			await Comment.deleteMany({
				eventId: taskId
			})
			
			if (event.parentId) {
				await Event.updateOne({
					_id: event.parentId,
				}, {
					$pull: {
						childOf: event._id
					}
				})
			}
			
			if (event.childOf.length > 0) {
				await Event.updateMany({
					parentId: event._id
				}, {
					parentId: undefined
				})
			}
			
			return res
				.status(200)
				.json({
					message: 'Событие успешно удалено'
				})
			
		} catch (e) {
			return res
				.status(500)
				.json({
					message: 'При удалении события произошла непредвиденная ошибка'
				})
		}
	},
	async getTaskScheme(req: AuthRequest<GetTaskSchemeInputProps>, res: express.Response<CustomResponseBody<GetTaskSchemeResult>>) {
		try {
			const {user, body} = req
			if (!user) {
				return res
					.status(403)
					.json({
						data: null,
						info: {
							message: 'Не удалось найти пользователя',
							type: 'error'
						}
					})
			}
			
			const {fromDate, toDate} = body
			
			const dateFilter = getTaskDateFilters(fromDate, toDate)
			
			if ("status" in dateFilter) {
				return res.status(dateFilter.status).json({
					data: dateFilter.json
				})
			}
			
			const calendars = await Calendars.find({
				userId: user._id,
				isSelected: true
			})
			
			if (!calendars) {
				return res
					.status(200)
					.json({
						data: {},
						info: {type: "info", message: "Активные календари не найдены"}
					})
			}
			
			console.log('календари в которых ищу события: ', calendars)
			
			const filters: { [key in keyof EventModel]?: any } = {
				...dateFilter.filter,
				userId: user._id,
				calendar: {
					$in: calendars.map((item) => item._id)
				}
			}
			
			const eventsFromDB: Array<EventModel> | null = await Event.find(filters)
			
			if (eventsFromDB && eventsFromDB.length > 0) {
				let result: GetTaskSchemeResult = {}
				
				eventsFromDB.forEach((event) => {
					const start = dayjs(event.time)
					const end = dayjs(event.timeEnd)
					
					if (start.isSame(end, 'date')) {
						const date: string = dayjs(event.time).format('DD-MM-YYYY')
						result[date] = true
						return
					}
					
					if (start.isAfter(end)) {
						return
					}
					
					let iterationDate = start
					
					while (iterationDate.isSameOrBefore(end, 'date')) {
						result[iterationDate.format('DD-MM-YYYY')] = true
						iterationDate = iterationDate.add(1, 'day')
					}
				})
				
				return res
					.status(200)
					.json({
						data: result,
					})
			}
			
			return res
				.status(200)
				.json({
					data: {},
					info: {
						message: 'События в данном промежутке дат - не найдены',
						type: 'warning'
					}
				})
			
		} catch (e) {
			return res
				.status(500)
				.json({
					data: {}
				})
		}
	},
	async getTaskInfo(req: AuthRequest<string, { taskId: string }>, res: express.Response<CustomResponseBody<FullResponseEventModel>>) {
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
			
			const taskInfo: EventModel | null = await Event.findOne({
				_id: params.taskId
			})
			
			console.log(taskInfo)
			
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
			
			
			if (
				!objectIdIsEquals(user._id, taskInfo.userId._id)
				&& !objectIdInArrayOfAnotherObjectId(user._id, taskInfo.members)
			) {
				return res
					.status(403)
					.json({
						data: null,
						info: {
							type: 'error',
							message: "Вы не можете просматривать это событие, так как у вас не хватает прав доступа"
						}
					})
			}
			
			const commentsCount = await getCommentsCount(taskInfo._id)
			const historyItemsCount = await getHistoryItemsCount(taskInfo._id)
			
			return res
				.status(200)
				.json({
					data: {
						...EventTransformer.eventItemResponse(taskInfo),
						chainsCount: getChainsCount(taskInfo),
						commentsCount,
						historyItemsCount,
					}
				})
			
		} catch (e) {
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
			
			const taskInfo: EventModelWithPopulateChildOf | null = await Event.findOne({
				_id: params.taskId
			})
				.populate(['childOf', 'parentId', 'linkedFrom'])
			
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
						childrenEvents: taskInfo.childOf.length ? taskInfo.childOf.map(EventTransformer.eventItemResponse) : null,
						parentEvent: taskInfo.parentId ? EventTransformer.eventItemResponse(taskInfo.parentId) : null,
						linkedFromEvent: taskInfo.linkedFrom ? EventTransformer.eventItemResponse(taskInfo.linkedFrom) : null
					}
				})
			
		} catch (e) {
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
	async updateTaskInfo(req: AuthRequest<UpdateTaskTypes>, res: express.Response<CustomResponseBody<null>>) {
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
			
			const task: EventModel | null = await Event.findOne({
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
			
			await Event.updateOne({_id: task._id}, newTaskInfo)
			
			const updated: EventModel | null = await Event.findOne({
				_id: task._id
			})
			
			if (updated) {
				await EventHistory.create(
					createEventHistoryNote({
						date: utcDate(),
						eventId: updated._id,
						fieldName: body.field,
						changeUserId: user._id,
						snapshotDescription: UpdateTaskDescription[body.field],
						eventSnapshot: eventSnapshot(updated, utcDate())
					})
				)
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
	async getCalendarsList(req: AuthRequest<{ exclude?: Array<CalendarsModel['type']> }>, res: express.Response<CustomResponseBody<Array<CalendarsModel>>>) {
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
			
			const list: Array<CalendarsModel> | null = await Calendars.find({
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
			
			await Calendars.updateOne<CalendarsModel>({
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
			
			const calendar = await Calendars.create({
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
			
			const calendar = await Calendars.findOneAndDelete({
				_id: req.body.id,
				userId: user._id,
				deletable: true
			})
			
			if (calendar) {
				const events: Array<EventModel> | null = await Event.find({
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
				
				await Event.deleteMany({
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
	async getCalendarInfo(req: AuthRequest<any, { calendarId: string }>, res: express.Response<CustomResponseBody<CalendarsModel>>) {
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
			
			const calendarInfo: CalendarsModel | null = await Calendars.findOne({
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
			
			const calendar: CalendarsModel | null = await Calendars.findOne({
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
			
			await Calendars.updateOne({
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
			
			const historyListFromDb: Array<EventHistoryPopulatedItem> | null = await EventHistory.find(
				{eventId: params.taskId},
				{},
				{sort: {date: -1}}
			).populate({
				path: 'eventSnapshot',
				populate: "childOf"
			})
			
			if (!historyListFromDb) {
				return res.status(404).json({
					data: null,
					info: {type: "warning", message: "Не удалось найти историю события"}
				})
			}
			
			console.log(historyListFromDb)
			
			return res
				.status(200)
				.json({
					data: historyListFromDb.map((item) => ({
						date: item.date,
						changeUserId: item.changeUserId,
						fieldName: item.fieldName,
						snapshotDescription: item.snapshotDescription,
						eventId: item.eventId,
						eventSnapshot: EventTransformer.eventItemResponse(item.eventSnapshot as unknown as EventModel)
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
			
			const task: EventModel | null = await Event.findOne({
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
				&& !objectIdInArrayOfAnotherObjectId(user._id, task.members)
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
			
			const event: EventModel | null = await Event.findOne({
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
				&& !objectIdInArrayOfAnotherObjectId(user._id, event.members)
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
			
			const event: EventModel | null = await Event.findOne({
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
	}
}

route.use(AuthMiddleware)
route.post('/add', handlers.addEvent)
route.post('/getTaskAtDay', handlers.getTaskAtDay)
route.post('/getTaskAtScope', handlers.getTaskAtScope)
route.post('/getTaskCountOfStatus', handlers.getTaskCountOfStatus)
route.post('/remove', handlers.removeTask)
route.post('/getTasksScheme', handlers.getTaskScheme)
route.post('/taskInfo/update', handlers.updateTaskInfo)
route.get('/taskInfo/:taskId', handlers.getTaskInfo)
route.get('/getEventChains/:taskId', handlers.getEventChains)
route.get('/getEventHistory/:taskId', handlers.getEventHistory)
route.post('/calendars', handlers.getCalendarsList)
route.post('/calendars/changeSelect', handlers.changeCalendarSelect)
route.post('/calendars/create', handlers.createCalendar)
route.post('/calendars/remove', handlers.removeCalendar)
route.get('/calendars/info/:calendarId', handlers.getCalendarInfo)
route.post('/calendars/update', handlers.updateCalendarInfo)
route.get('/comments/:taskId', handlers.getEventCommentList)
route.post('/comments/add', handlers.addEventComment)
route.post('/comments/remove', handlers.removeEventComment)


export const EventsRouter = route