import express from "express";
import {
	CalendarPriorityKeys,
	DbEventModel,
	Event,
	EventLinkItem,
	EventModel,
	TaskStatusesType
} from "../../mongo/models/EventModel";
import {UserModel} from "../../mongo/models/User";
import {AuthMiddleware} from "../../middlewares/auth.middleware";
import dayjs from "dayjs";
import {Schema} from "mongoose";
import {
	changeTaskData,
	getEventHistoryObject,
	getTaskStorage, TaskStorage,
	UpdateTaskInfo,
	utcDate,
	utcString
} from "../../common/common";
import {UpdateTaskTypes} from "./types";
import {colorRegExpDefault, colorRegExpRGBA, TaskStatusesObject} from "../../common/constants";
import {Calendars, CalendarsModel} from "../../mongo/models/Calendars";
import {FullResponseEventModel, ShortEventItemResponse} from "../../common/transform/events/types";
import {EventTransformer} from "../../common/transform/events/events";

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
}

export interface AuthRequest<Data extends any = any, Params = any> extends express.Request<Params, any, Data> {
	user?: UserModel
}

export type FilterTaskStatuses = 'in_work' | 'completed' | 'archive' | 'created'

interface GetTaskAtDayInputValues {
	fromDate: string,
	toDate: string,
	title: string | null,
	priority: CalendarPriorityKeys | null,
	taskStatus: FilterTaskStatuses
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

export const getTaskFiltersOfScope = async (res: express.Response, user: UserModel, options: Partial<GetTaskAtDayInputValues>): Promise<GetTaskFiltersErrorReturned | GetTaskFiltersScopeReturned> => {
	const {fromDate, toDate, title, priority, taskStatus} = options
	
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
	
	const calendars: Array<CalendarsModel> = await Calendars.find({
		userId: user._id,
		isSelected: true,
	})
	
	const dateFilter = {
		$gte: startDate.utc().toDate(),
		$lte: endDate.utc().toDate()
	}
	
	const filter: Partial<{ [key in keyof EventModel]: any }> = {
		time: dateFilter,
		userId: user._id,
		calendar: {
			$in: calendars.map((item) => item._id)
		}
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
				linkedFrom
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
			
			const createdEvent = await Event.create({
				linkedFrom: linkedFrom || undefined,
				calendar: resultCalendar,
				title,
				status,
				priority,
				createdAt: utcDate(),
				time: utcDate(startTime),
				timeEnd: utcDate(endTime),
				type,
				link,
				userId: user._id,
				description: description || '',
				members: [],
				lastChange: utcDate(),
				history: [
					getEventHistoryObject(null, {id: '', data: utcString(), field: 'createdAt'}, user)
				]
			})
			
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
					{
						path: 'history',
						populate: 'userId',
					},
					{path: 'calendar'}
				],
			})
			
			if (!eventsFromDB) {
				return res
					.status(404)
					.json({})
			}
			
			const shortEvents = eventsFromDB.map(EventTransformer.shortEventItemResponse)
			
			console.log(shortEvents)
			
			const storage = getTaskStorage(shortEvents)
			
			return res
				.status(200)
				.json(storage)
			
			
		} catch (e) {
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
			
			const eventsFromDB: Array<EventModel> | null = await Event.find(filter, {}, {
				sort: {time: 1},
				populate: [
					{
						path: 'history',
						populate: 'userId',
					},
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
			
			const template: { [key in FilterTaskStatuses]: number } = {
				archive: 0,
				created: 0,
				completed: 0,
				in_work: 0
			}
			
			const statusMap: Partial<{ [key in TaskStatusesType]: FilterTaskStatuses }> = {}
			
			for (let key in TaskStatusesObject) {
				const statuses = TaskStatusesObject[key as FilterTaskStatuses]
				
				statuses.forEach((item) => {
					statusMap[item] = key as FilterTaskStatuses
				})
				
			}
			
			events.forEach((item) => {
				const s: FilterTaskStatuses | undefined = statusMap[item.status]
				if (s) {
					template[s]++
				}
			})
			
			return res.status(200).json(template)
			
		} catch (e) {
			console.log(e)
			return res.status(500).json({})
		}
	},
	async removeTask(req: AuthRequest<{ id: string }>, res: express.Response) {
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
			
			if (event.status !== 'archive') {
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
			
			const startDate = dayjs(fromDate)
			
			if (!startDate.isValid()) {
				return res
					.status(400)
					.json({
						data: null,
						info: {
							message: 'Дата начала схемы событий - невалидна',
							type: 'error'
						}
					})
			}
			
			const endDate = dayjs(toDate)
			
			if (!endDate.isValid()) {
				return res
					.status(400)
					.json({
						data: null,
						info: {
							message: 'Дата завершения схемы событий - невалидна',
							type: 'error'
						}
					})
			}
			
			const dateFilter = {
				$gte: startDate.utc().toDate(),
				$lte: endDate.utc().toDate()
			}
			
			const filters: { [key in keyof EventModel]?: any } = {
				time: dateFilter,
				timeEnd: dateFilter,
				userId: user._id
			}
			
			const eventsFromDB: Array<EventModel> | null = await Event.find(filters)
			
			if (eventsFromDB && eventsFromDB.length > 0) {
				let result: GetTaskSchemeResult = {}
				
				eventsFromDB.forEach((event) => {
					const date: string = dayjs(event.time).format('DD-MM-YYYY')
					
					result[date] = true
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
					data: EventTransformer.eventItemResponse(taskInfo)
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
			
			const hasData = !!body.data
			
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
			
			const updated = await Event.updateOne({_id: task._id}, newTaskInfo)
			
			console.log('Союытие обнолено', updated)
			
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
			
			const calendar = await Calendars.findOne({
				_id: req.body.id,
				userId: user._id,
				deletable: true
			})
			
			if (calendar) {
				await Calendars.deleteOne({
					_id: req.body.id,
					userId: user._id,
					deletable: true
				})
				
				await Event.deleteMany({
					calendar: req.body.id,
					userId: user._id,
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
	updateCalendarInfo: async function (req: AuthRequest<{ title: string, color: string, id: string }>, res: express.Response) {
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
route.post('/calendars', handlers.getCalendarsList)
route.post('/calendars/changeSelect', handlers.changeCalendarSelect)
route.post('/calendars/create', handlers.createCalendar)
route.post('/calendars/remove', handlers.removeCalendar)
route.get('/calendars/info/:calendarId', handlers.getCalendarInfo)
route.post('/calendars/update', handlers.updateCalendarInfo)


export const EventsRouter = route