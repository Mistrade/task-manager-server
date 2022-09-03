import express from "express";
import {Event, EventHistoryItem, EventModel} from "../../mongo/models/Event";
import {User, UserModel} from "../../mongo/models/User";
import {AuthMiddleware} from "../../middlewares/auth.middleware";
import dayjs from "dayjs";
import * as Events from "events";
import {Schema} from "mongoose";

const route = express.Router()

export type CalendarPriorityKeys =
	'veryLow'
	| 'low'
	| 'medium'
	| 'high'
	| 'veryHigh'
	| 'not_selected'

export type TaskStatusesType = 'completed' | 'created' | 'in_progress' | 'review'

export interface EventLinkItem {
	key: string,
	value: string
}


interface RequestTaskBody {
	title: string,
	type: 'event',
	status: TaskStatusesType,
	priority: CalendarPriorityKeys,
	time: string,
	timeEnd: string,
	link: EventLinkItem | null
}

export interface AuthRequest<Data extends any = any, Params = any> extends express.Request<Params, any, Data> {
	user?: UserModel
}

interface GetTaskAtDayInputValues {
	fromDate: string,
	toDate: string,
	title: string | null,
	priority: CalendarPriorityKeys | null
}

interface EventItem extends Omit<EventModel, 'createdAt' | 'time' | 'timeEnd' | 'lastChange' | '_id'> {
	id: Schema.Types.ObjectId | string,
	createdAt: string,
	time: string,
	timeEnd: string,
	lastChange: string,
}

interface DetailUserModel extends Omit<UserModel, '_id' | "created" | 'password'> {
	id: string | Schema.Types.ObjectId,
	created: string
}

interface DetailHistoryItemFromDb extends Omit<EventHistoryItem, 'userId'> {
	userId: UserModel
}

interface DetailHistoryItem extends Omit<DetailHistoryItemFromDb, 'date' | 'userId'> {
	date: string,
	userId: DetailUserModel
}

interface DetailEventModel extends Omit<EventModel, 'history'> {
	history: Array<DetailHistoryItemFromDb>
}

interface DetailEventItem extends Omit<EventItem, 'history'> {
	history: Array<DetailHistoryItem>
}

interface GetTaskAtDayResult {
	events: Array<EventItem>,
	errorMessage?: string
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

export type ShortEventItem = Pick<EventItem, 'title' | 'time' | 'timeEnd' | 'link' | 'id' | 'priority' | 'description' | 'status'>

export const handlers = {
	addEvent: async (req: AuthRequest<RequestTaskBody>, res: express.Response) => {
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
				link
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
			
			const createdAt = dayjs().utc().toDate()
			
			const result: EventModel = {
				title,
				status,
				priority,
				createdAt,
				time: startTime.utc().toDate(),
				timeEnd: endTime.utc().toDate(),
				type,
				link,
				userId: user._id,
				description: '',
				members: [],
				lastChange: dayjs().utc().toDate(),
				history: [
					{
						date: dayjs().utc().toDate(),
						field: 'createdAt',
						description: `Событие было создано пользователем: ${user.phone}`,
						userId: user._id,
						oldValue: null,
						newValue: createdAt
					}
				]
			}
			
			
			await Event.create(result)
			
			return res.status(200).json({
				message: 'Событие было успешно создано',
			})
		} catch (e) {
			return res.status(500).json({
				message: 'Не удалось сохранить событие'
			})
		}
	},
	async getTaskAtDay(req: AuthRequest<GetTaskAtDayInputValues>, res: express.Response<Array<ShortEventItem>>) {
		try {
			const {user} = req
			
			if (!user) {
				return res
					.status(403)
					.json([])
			}
			
			const {fromDate, toDate, title, priority} = req.body
			
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
			
			const dateFilter = {
				$gte: startDate.utc().toDate(),
				$lte: endDate.utc().toDate()
			}
			
			const filter: { [key: string]: any } = {
				time: dateFilter,
				timeEnd: dateFilter,
				userId: user._id,
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
				sort: '1',
				populate: {
					path: 'history',
					populate: 'userId',
					transform: (doc: UserModel) => {
						return {
							...doc,
							password: undefined
						}
					}
				}
			})
			
			if (eventsFromDB) {
				return res
					.status(200)
					.json(
						eventsFromDB.map((event) => {
							return {
								id: event._id || '',
								title: event.title || '',
								status: event.status,
								description: event.description || '',
								link: event.link || null,
								priority: event.priority,
								time: dayjs(event.time).utc().toString(),
								timeEnd: dayjs(event.timeEnd).utc().toString(),
							}
						})
					)
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
	async getTaskInfo(req: AuthRequest<string, { taskId: string }>, res: express.Response<CustomResponseBody<DetailEventItem>>) {
		try {
			const {user, params} = req
			
			if (!user) {
				return res
					.status(200)
					.json({
						data: null,
						info: {
							message: 'Пользователь не найден',
							type: 'error'
						}
					})
			}
			
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
			
			const taskInfo: DetailEventModel | null = await Event.findOne({
				id: params.taskId
			}, {}, {
				populate: {
					path: 'history',
					populate: 'userId'
				}
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
					data: {
						id: taskInfo._id || '',
						title: taskInfo.title,
						time: dayjs(taskInfo.time).utc().toString(),
						timeEnd: dayjs(taskInfo.timeEnd).utc().toString(),
						createdAt: dayjs(taskInfo.createdAt).utc().toString(),
						lastChange: dayjs(taskInfo.lastChange).utc().toString(),
						description: taskInfo.description,
						status: taskInfo.status,
						history: taskInfo.history.map((item: DetailHistoryItemFromDb) => {
							return {
								date: dayjs(item.date).utc().toString(),
								description: item.description,
								newValue: item.newValue,
								oldValue: item.oldValue,
								field: item.field,
								userId: {
									phone: item.userId.phone,
									name: item.userId.name,
									id: item.userId._id,
									created: dayjs(item.userId.created).utc().toString(),
								}
							}
						}),
						link: taskInfo.link,
						members: taskInfo.members,
						priority: taskInfo.priority,
						type: taskInfo.type,
						userId: taskInfo.userId
					},
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
	}
}

route.use(AuthMiddleware)
route.post('/add', handlers.addEvent)
route.post('/getTaskAtDay', handlers.getTaskAtDay)
route.post('/remove', handlers.removeTask)
route.post('/getTasksScheme', handlers.getTaskScheme)
route.get('/taskInfo/:taskId', handlers.getTaskInfo)


export const EventsRouter = route