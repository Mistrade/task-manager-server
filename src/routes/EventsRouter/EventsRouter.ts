import express from "express";
import {CalendarPriorityKeys, Event, EventLinkItem, EventModel, TaskStatusesType} from "../../mongo/models/EventModel";
import {UserModel} from "../../mongo/models/User";
import {AuthMiddleware} from "../../middlewares/auth.middleware";
import dayjs from "dayjs";
import {Schema} from "mongoose";
import {changeTaskData, getEventHistoryObject, UpdateTaskInfo, utcDate, utcString} from "../../common/common";
import {UpdateTaskTypes} from "./types";
import {TaskStatusesObject} from "../../common/constants";
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
	calendar: Schema.Types.ObjectId
}

export interface AuthRequest<Data extends any = any, Params = any> extends express.Request<Params, any, Data> {
	user?: UserModel
}

export type FilterTaskStatuses = 'in_work' | 'completed' | 'archive'

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


export const handlers = {
	async addEvent(req: AuthRequest<RequestTaskBody>, res: express.Response) {
		try {
			const {user} = req
			
			if (!user) {
				return res.status(404).json({
					message: 'Произошла ошибка сохранения события.'
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
				calendar
			} = req.body
			
			const startTime = dayjs(time)
			
			if (!startTime.isValid()) {
				return res.status(400).json({
					message: 'Невалидная дата начала события'
				})
			}
			
			const endTime = dayjs(timeEnd)
			
			if (!endTime.isValid()) {
				return res.status(400).json({
					message: 'Невалидная дата завершения события'
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
			
			await Event.create({
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
				message: 'Событие было успешно создано',
			})
		} catch (e) {
			return res.status(500).json({
				message: 'Не удалось сохранить событие'
			})
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
			
			const {fromDate, toDate, title, priority, taskStatus} = req.body
			
			const startDate = dayjs(fromDate)
			
			if (!startDate.isValid()) {
				return res
					.status(400)
					.json([])
			}
			
			const endDate = dayjs(toDate)
			
			if (!endDate.isValid()) {
				return res
					.status(400)
					.json([])
			}
			
			const calendars: Array<CalendarsModel> = await Calendars.find({
				userId: user._id,
				isSelected: true,
			})
			
			const dateFilter = {
				$gte: startDate.utc().toDate(),
				$lte: endDate.utc().toDate()
			}
			
			const filter: { [key: string]: any } = {
				time: dateFilter,
				userId: user._id,
				status: {
					$in: TaskStatusesObject[taskStatus || 'in_work']
				},
				calendar: {
					$in: calendars.map((item) => item._id)
				}
			}
			
			if (title) {
				filter.title = {
					$regex: `${title}`
				}
			}
			
			if (priority && priority !== 'not_selected') {
				filter.priority = {
					$eq: priority
				}
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
		
	}
	
}

route.use(AuthMiddleware)
route.post('/add', handlers.addEvent)
route.post('/getTaskAtDay', handlers.getTaskAtDay)
route.post('/remove', handlers.removeTask)
route.post('/getTasksScheme', handlers.getTaskScheme)
route.post('/taskInfo/update', handlers.updateTaskInfo)
route.get('/taskInfo/:taskId', handlers.getTaskInfo)
route.post('/calendars', handlers.getCalendarsList)
route.post('/calendars/changeSelect', handlers.changeCalendarSelect)


export const EventsRouter = route