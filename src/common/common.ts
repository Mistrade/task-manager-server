import {DbEventModel, EventHistoryItem, EventModel} from "../mongo/models/EventModel";
import dayjs from "dayjs";
import {SystemUpdateTaskTypes, UpdateTaskTypes} from "../routes/EventsRouter/types";
import {UserModel} from "../mongo/models/User";
import {Calendars, CalendarsModel} from "../mongo/models/Calendars";
import {EventTransformer} from "./transform/events/events";
import {ShortEventItemResponse} from "./transform/events/types";

export type HistoryDescriptionObject = {
	[key in keyof EventModel]: string
}

export const HistoryDescription: HistoryDescriptionObject = {
	_id: 'Изменен ID события',
	calendar: 'Изменен календарь, за которым было закреплено событие',
	createdAt: 'Событие было создано',
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
	history: 'Изменен список истории события',
	userId: 'Изменен владелец события',
	members: 'Добавлен(-ы) участник(-и) события', //+
}


export const getEventHistoryObject = (task: EventModel | null, body: SystemUpdateTaskTypes, userId: UserModel): EventHistoryItem => {
	const {field, data} = body
	
	const date = dayjs().utc().toDate()
	
	const DefaultData = {
		date,
		field,
		userId,
		description: HistoryDescription[field]
	}
	
	switch (field) {
		case 'calendar':
			return {
				...DefaultData,
				oldValue: task?.calendar.title || '',
				newValue: `${body.data}`
			}
		case "createdAt":
			return {
				...DefaultData,
				oldValue: task?.createdAt ? dayjs(task.createdAt).utc().toString() : '',
				newValue: body.data
			}
		case "link":
			return {
				...DefaultData,
				oldValue: task && task[field] ? task[field]?.value || '' : '',
				newValue: data?.value,
			}
		case "priority":
			return {
				...DefaultData,
				oldValue: (task && task[field]) || '',
				newValue: data,
			}
		case "status":
			return {
				...DefaultData,
				oldValue: (task && task[field]) || '',
				newValue: data,
			}
		case "time":
			return {
				...DefaultData,
				oldValue: (task && dayjs(task[field]).utc().toString()) || '',
				newValue: dayjs(data).utc().toString(),
			}
		case "timeEnd":
			return {
				...DefaultData,
				oldValue: (task && dayjs(task[field]).utc().toString()) || '',
				newValue: dayjs(data).utc().toString(),
			}
		case "title":
			return {
				...DefaultData,
				oldValue: (task && task[field]) || '',
				newValue: data,
			}
		case "description":
			return {
				...DefaultData,
				oldValue: (task && task[field]) || '',
				newValue: data,
			}
		case "members":
			return {
				...DefaultData,
				oldValue: '',
				newValue: ''
			}
	}
}

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
		calendar: true
	}
	
	if (!body.field || !body.id || !fieldsForUpdates[body.field] || !body.data) {
		return 'Неверные данные для изменения значений'
	}
	
	const {field, data, id: taskId} = body
	
	
	switch (field) {
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

export const changeTaskData = (task: EventModel, body: UpdateTaskTypes, userId: UserModel): DbEventModel | string => {
	const fieldsForUpdates: { [key in UpdateTaskTypes['field']]: boolean } = {
		status: true,
		priority: true,
		description: true,
		time: true,
		timeEnd: true,
		title: true,
		members: true,
		link: true,
		calendar: true
	}
	
	if (!body.field || !body.id || !fieldsForUpdates[body.field] || !body.data) {
		return 'Неверные данные для изменения значений'
	}
	
	const taskItem: DbEventModel = {
		calendar: task.calendar._id,
		_id: task._id,
		lastChange: task.lastChange,
		link: task.link,
		linkedFrom: task.linkedFrom,
		title: task.title,
		type: task.type,
		time: task.time,
		timeEnd: task.timeEnd,
		history: task.history.map(EventTransformer.historyItemDb),
		description: task.description,
		userId: task.userId._id,
		status: task.status,
		createdAt: task.createdAt,
		members: task.members.map((item) => item._id),
		priority: task.priority
	}
	
	const {field, data, id: taskId} = body
	
	switch (field) {
		case "title":
			if (typeof data !== 'string') {
				return 'Заголовок должен быть строкой'
			}
			taskItem.title = data
			break;
		case "description":
			if (typeof data !== 'string') {
				return 'Описание должно быть строкой'
			}
			taskItem.description = data
			break;
		case "link":
			if (typeof data !== 'object' || !data.key || !data.value || typeof data.value !== 'string' || typeof data.key !== 'string') {
				return 'Некорректная ссылка'
			}
			taskItem.link = data
			break;
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
			
			taskItem.timeEnd = dayjs(data).utc().toDate()
			break;
		case "time":
			const newStartTime = dayjs(data).utc()
			if (typeof data !== 'string' || !newStartTime.isValid()) {
				return 'Некорректная дата начала события'
			}
			
			const timeEnd = dayjs(taskItem.timeEnd).utc()
			
			if (newStartTime.isSameOrAfter(timeEnd, 'minute')) {
				const duration = dayjs(taskItem.timeEnd).utc().diff(dayjs(taskItem.time).utc(), 'minute')
				const timeEndResult = newStartTime.add(duration, 'minute')
				
				taskItem.timeEnd = timeEndResult.utc().toDate()
				taskItem.time = newStartTime.utc().toDate()
				break;
			}
			
			taskItem.time = newStartTime.toDate()
			break;
		case "status":
			taskItem.status = data
			break;
		case "priority":
			taskItem.priority = data
			break;
		case "calendar":
		
		default:
			return 'Неверные данные для редактирования события'
	}
	
	
	return taskItem
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

export const setTaskAtDay = (storage: TaskStorage, day: Date, event: ShortEventItemResponse): TaskStorage => {
	console.log('set task at day is atrted')
	let newStorage = {
		...storage
	}
	
	const y: number = day.getFullYear()
	const m: number = day.getMonth()
	const d: number = day.getDate()
	
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

export const setTask = (storage: TaskStorage, event: ShortEventItemResponse): TaskSetResult => {
	try {
		
		const isOneDay = dayjs(event.time).isSame(dayjs(event.timeEnd), 'day')
		
		if (isOneDay) {
			storage = setTaskAtDay(storage, dayjs(event.time).toDate(), event)
			return {status: true, storage}
		} else {
			let i = dayjs(event.time)
			while (i.isSameOrBefore(dayjs(event.timeEnd), 'day')) {
				storage = setTaskAtDay(storage, i.toDate(), event)
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

export const getTaskStorage = (tasks: Array<ShortEventItemResponse>): TaskStorage => {
	let r: TaskStorage = {}
	
	tasks.forEach((task) => {
		const t = setTask(r, task)
		r = t.storage
	})
	
	return r || {}
}