import {DbEventModel, EventModel} from "../mongo/models/EventModel";
import dayjs, {Dayjs} from "dayjs";
import {UpdateTaskTypes} from "../routes/EventsRouter/types";
import {UserModel} from "../mongo/models/User";
import {Calendars, CalendarsModel} from "../mongo/models/Calendars";
import {ShortEventItemResponse} from "./transform/events/types";
import {Schema} from "mongoose";

export type HistoryDescriptionObject = {
	[key in keyof EventModel]: string
}

export const HistoryDescription: HistoryDescriptionObject = {
	_id: 'Изменен ID события',
	calendar: 'Изменен календарь события',
	createdAt: 'Событие создано',
	status: 'Изменен статус события', //+
	priority: 'Изменен приоритет события', //+
	description: 'Изменено описание события', //+
	timeEnd: 'Изменена дата завершения события', //+
	time: 'Изменена дата начала события', //+
	lastChange: 'Изменена дата последнего редактирования события',
	link: 'Изменена ссылка для подключения к событию', //+
	linkedFrom: 'Событие было клонировано от другого события',
	title: 'Изменен заголовок события', //+
	type: 'Изменен тип события',
	userId: 'Изменен владелец события',
	members: 'Добавлен(-ы) участник(-и) события', //+
	isLiked: 'Добавлено/Удалено в(из) избранно(е|го)',
	childOf: "123"
}

export const UpdateTaskDescription: { [key in UpdateTaskTypes['field']]: string } = {
	status: "Изменен статус",
	calendar: "Изменен календарь",
	description: "Изменено описание",
	priority: "Изменен приоритет",
	link: "Изменена ссылка для подключения",
	members: "Изменен список участников",
	time: "Изменено время начала",
	timeEnd: "Изменено время завершения",
	title: "Изменено название (заголовок)",
	isLiked: "Событие было помечено (снято) как особое"
}

// export const getEventHistoryObject = (task: EventModel | null, body: SystemUpdateTaskTypes, userId: UserModel): EventHistoryItem => {
// 	const {field, data} = body
//
// 	const date = dayjs().utc().toDate()
//
// 	const DefaultData = {
// 		date,
// 		field,
// 		userId,
// 		description: HistoryDescription[field]
// 	}
//
// 	switch (field) {
// 		case "isLiked":
// 			return {
// 				...DefaultData,
// 				oldValue: `${task?.isLiked || false}`,
// 				newValue: `${body.data}`,
// 			}
// 		case 'calendar':
// 			return {
// 				...DefaultData,
// 				oldValue: task?.calendar.title || '',
// 				newValue: `${body.data}`
// 			}
// 		case "createdAt":
// 			return {
// 				...DefaultData,
// 				oldValue: task?.createdAt ? dayjs(task.createdAt).utc().toString() : '',
// 				newValue: body.data
// 			}
// 		case "link":
// 			return {
// 				...DefaultData,
// 				oldValue: task && task[field] ? task[field]?.value || '' : '',
// 				newValue: data?.value,
// 			}
// 		case "priority":
// 			return {
// 				...DefaultData,
// 				oldValue: (task && task[field]) || '',
// 				newValue: data,
// 			}
// 		case "status":
// 			return {
// 				...DefaultData,
// 				oldValue: (task && task[field]) || '',
// 				newValue: data,
// 			}
// 		case "time":
// 			return {
// 				...DefaultData,
// 				oldValue: (task && dayjs(task[field]).utc().toString()) || '',
// 				newValue: dayjs(data).utc().toString(),
// 			}
// 		case "timeEnd":
// 			return {
// 				...DefaultData,
// 				oldValue: (task && dayjs(task[field]).utc().toString()) || '',
// 				newValue: dayjs(data).utc().toString(),
// 			}
// 		case "title":
// 			return {
// 				...DefaultData,
// 				oldValue: (task && task[field]) || '',
// 				newValue: data,
// 			}
// 		case "description":
// 			return {
// 				...DefaultData,
// 				oldValue: (task && task[field]) || '',
// 				newValue: data,
// 			}
// 		case "members":
// 			return {
// 				...DefaultData,
// 				oldValue: '',
// 				newValue: ''
// 			}
// 	}
// }

export type UpdateTaskInfoReturn = {
	[key in keyof EventModel]?: DbEventModel[key]
}

export const UpdateTaskInfo = (taskItem: EventModel, body: UpdateTaskTypes, user: UserModel): UpdateTaskInfoReturn | string => {
	const fieldsForUpdates: { [key in UpdateTaskTypes['field']]: boolean } = {
		status: true,
		priority: true,
		description: true,
		time: true,
		timeEnd: true,
		title: true,
		members: true,
		link: true,
		calendar: true,
		isLiked: true,
	}
	
	if (!body.field || !body.id || !fieldsForUpdates[body.field] || (!body.data && body.data !== false && body.data !== null)) {
		return 'Неверные данные для изменения значений'
	}
	
	const {field, data, id: taskId} = body
	
	
	switch (field) {
		case 'isLiked':
			if (typeof data !== 'boolean') {
				return 'Не удалось изменить состояние лайка'
			}
			
			return {
				isLiked: data
			}
		case 'calendar':
			if (typeof data !== 'string') {
				return 'Ожидался идентификатор календаря'
			}
			
			return {
				calendar: data
			}
		case "title":
			if (typeof data !== 'string') {
				return 'Заголовок должен быть строкой'
			}
			
			return {
				title: data
			}
		
		case "description":
			if (typeof data !== 'string') {
				return 'Описание должно быть строкой'
			}
			return {
				description: data
			}
		case "link":
			if (data === null) {
				return {
					link: data
				}
			}
			
			if (typeof data !== 'object' || !data.key || !data.value || typeof data.value !== 'string' || typeof data.key !== 'string') {
				return 'Некорректная ссылка'
			}
			return {
				link: data
			}
		case "members":
			// taskItem.members.push(data)
			return 'MEMBERS NOT CHANGED'
		case "timeEnd":
			const endTime = dayjs(data)
			if (typeof data !== 'string' || !endTime.isValid()) {
				return 'Некорректная дата завершения события'
			}
			
			if (endTime.isSameOrBefore(dayjs(taskItem.time), 'minute')) {
				return 'Дата завершения должна быть после даты начала события'
			}
			
			return {
				timeEnd: dayjs(data).utc().toDate()
			}
		case "time":
			const newStartTime = dayjs(data).utc()
			if (typeof data !== 'string' || !newStartTime.isValid()) {
				return 'Некорректная дата начала события'
			}
			
			const timeEnd = dayjs(taskItem.timeEnd).utc()
			
			if (newStartTime.isSameOrAfter(timeEnd, 'minute')) {
				const duration = dayjs(taskItem.timeEnd).utc().diff(dayjs(taskItem.time).utc(), 'minute')
				const timeEndResult = newStartTime.add(duration, 'minute')
				
				return {
					timeEnd: timeEndResult.utc().toDate(),
					time: newStartTime.utc().toDate()
				}
			}
			
			return {
				time: newStartTime.toDate()
			}
		case "status":
			return {
				status: data
			}
		case "priority":
			return {
				priority: data
			}
		default:
			return 'Неверные данные для редактирования события'
	}
}

export const createBaseCalendars = async (user: UserModel) => {
	try {
		const homeCalendar: CalendarsModel = await Calendars.create({
			userId: user._id,
			title: 'Домашний календарь',
			isSelected: true,
			editable: true,
			deletable: false,
			color: 'rgba(100,149,237,.9)',
			type: 'Main'
		})
		
		const workCalendar: CalendarsModel = await Calendars.create({
			userId: user._id,
			title: 'Рабочий календарь',
			isSelected: true,
			editable: true,
			deletable: true,
			color: '#FFA4A4'
		})
		
		const invitedCalendar: CalendarsModel = await Calendars.create({
			userId: user._id,
			title: 'Приглашения',
			isSelected: true,
			editable: false,
			deletable: false,
			color: '#D46600',
			type: 'Invite'
		})
		
		return true
	} catch (e) {
		return false
	}
}

export const utcString = (date?: Date | dayjs.Dayjs): string => {
	return date ? dayjs(date).utc().toString() : dayjs().utc().toString()
}

export const utcDate = (date?: Date | dayjs.Dayjs): Date => {
	return date ? dayjs(date).utc().toDate() : dayjs().utc().toDate()
}

export type CustomObject<T = any> = { [key in string]: T }
export type PartialCustomObject<T = any> = Partial<{ [key in string]: T }>

export type TaskStorage = CustomObject<TaskYear>
export type TaskYear = CustomObject<TaskMonth>
export type TaskMonth = CustomObject<TaskDate>
export type TaskDate = Array<ShortEventItemResponse>

export interface TaskSetResult {
	status: boolean,
	storage: TaskStorage
}

export const setTaskAtDay = (storage: TaskStorage, storageDate: Date, event: ShortEventItemResponse, utcOffset: number): TaskStorage => {
	console.log('set task at day is atrted')
	let newStorage = {
		...storage
	}
	
	const addUtcOffset = (date: Date): Dayjs => {
		if (!utcOffset || utcOffset === 0) {
			return dayjs(date)
		}
		
		return dayjs(date).utcOffset(utcOffset, false)
	}
	
	const day = addUtcOffset(storageDate)
	
	const y: number = day.year()
	
	const m: number = day.month()
	const d: number = day.date()
	
	const currentYear: TaskYear = newStorage[y] || {}
	const currentMonth: TaskMonth = currentYear[m] || {}
	const currentDate: TaskDate = currentMonth[d] || []
	
	const date: TaskDate = [...currentDate]
	date.push(event)
	
	const month = {
		...currentMonth,
		[`${d}`]: date
	}
	
	const year = {
		...currentYear,
		[`${m}`]: month
	}
	
	newStorage = {
		...newStorage,
		[`${y}`]: year
	}
	
	return newStorage
}

export const setTask = (storage: TaskStorage, event: ShortEventItemResponse, utcOffset: number): TaskSetResult => {
	try {
		
		const isOneDay = dayjs(event.time).utcOffset(utcOffset, false).isSame(dayjs(event.timeEnd).utcOffset(utcOffset, false), 'day')
		
		if (isOneDay) {
			storage = setTaskAtDay(storage, dayjs(event.time).utcOffset(utcOffset, false).toDate(), event, utcOffset)
			return {status: true, storage}
		} else {
			let i = dayjs(event.time).utcOffset(utcOffset, false)
			while (i.isSameOrBefore(dayjs(event.timeEnd).utcOffset(utcOffset, false), 'day')) {
				storage = setTaskAtDay(storage, i.toDate(), event, utcOffset)
				i = i.add(1, 'day')
			}
			return {status: true, storage}
		}
	} catch (e) {
		console.log(e)
		return {
			status: false,
			storage
		}
	}
}

export const getTaskStorage = (tasks: Array<ShortEventItemResponse>, utcOffset: number): TaskStorage => {
	let r: TaskStorage = {}
	
	tasks.forEach((task) => {
		const t = setTask(r, task, utcOffset)
		r = t.storage
	})
	
	return r || {}
}

export const eventSnapshot = (event: EventModel, changed: Date): DbEventModel => {
	return {
		...event,
		userId: event.userId._id,
		calendar: event.calendar._id,
		lastChange: changed,
		members: event.members.map((item) => item._id),
	}
}

export const objectIdIsEquals = (userObjectId1: Schema.Types.ObjectId, userObjectId2: Schema.Types.ObjectId) => {
	return userObjectId1.toString() === userObjectId2.toString()
}

export const objectIdInArrayOfAnotherObjectId = (userId: Schema.Types.ObjectId, usersArray: Array<{ _id: Schema.Types.ObjectId }>) => {
	return usersArray.some((item) => objectIdIsEquals(userId, item._id))
}