import {
	EventBuildTypes,
	EventCounterOfStatus,
	EventSchemeResponse,
	EventsStorage,
	EventsStorageDate,
	EventsStorageMonth,
	EventsStorageYear,
	ReturnEventTypeAfterBuild
} from "../../info/types";
import dayjs, {Dayjs} from "dayjs";
import {TaskFilteredStatusesObject} from "../../../../common/constants";
import {FilterTaskStatuses} from "../../types";

/** @class EventsStorageHelper
 * @summary Класс, с набором методов для сборки EventStorage (формат ответа) и схемы событий
 * @since 25.02.2023
 * @author Андрей Черников
 */
export class EventsStorageHelper {
	constructor() {
	}
	
	/**@name utcOffsetDate
	 * @summary Добавляет к полученной дате, смещение от UTC
	 * @param date {Date, Dayjs, string} - Дата, к которой надо добавить смещение от UTC
	 * @param utcOffset - Смещение от UTC в минутах
	 * @private
	 * @since 25.02.2023
	 */
	private utcOffsetDate(date: Date | Dayjs | string, utcOffset: number): Dayjs {
		if (!utcOffset || utcOffset === 0) {
			return dayjs(date)
		}
		
		return dayjs(date).utcOffset(utcOffset, false)
	}
	
	
	private setEventAtEventsStorageDate<BuildType extends EventBuildTypes>(
		storage: EventsStorage<BuildType>,
		storageDate: Date,
		event: ReturnEventTypeAfterBuild<BuildType>,
		utcOffset: number,
	): EventsStorage<BuildType> {
		let newStorage: EventsStorage<BuildType> = {
			...storage
		}
		
		const day = this.utcOffsetDate(storageDate, utcOffset)
		
		const y: number = day.year()
		const m: number = day.month()
		const d: number = day.date()
		
		const currentYear: EventsStorageYear<BuildType> = newStorage[y] || {}
		const currentMonth: EventsStorageMonth<BuildType> = currentYear[m] || {}
		const currentDate: EventsStorageDate<BuildType> = currentMonth[d] || []
		
		const date: EventsStorageDate<BuildType> = [...currentDate]
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
	
	private setEventsToEventsStorage<BuildType extends EventBuildTypes>(
		storage: EventsStorage<BuildType>,
		event: ReturnEventTypeAfterBuild<BuildType>,
		utcOffset: number
	): EventsStorage<BuildType> {
		
		const start = this.utcOffsetDate(event.time, utcOffset)
		const end = this.utcOffsetDate(event.timeEnd, utcOffset)
		
		const isOneDay = start.isSame(end, 'day')
		
		if (isOneDay) {
			return this.setEventAtEventsStorageDate(storage, start.toDate(), event, utcOffset)
		} else {
			let i = start
			while (i.isSameOrBefore(end, 'day')) {
				storage = this.setEventAtEventsStorageDate(storage, i.toDate(), event, utcOffset)
				i = i.add(1, 'day')
			}
			return storage
		}
	}
	
	public buildEventsStorage<BuildType extends EventBuildTypes>(
		arr: Array<ReturnEventTypeAfterBuild<BuildType>>,
		utcOffset: number,
	): EventsStorage<BuildType> {
		let eventStorage: EventsStorage<BuildType> = {}
		
		arr.forEach((event) => {
			eventStorage = this.setEventsToEventsStorage(eventStorage, event, utcOffset)
		})
		
		return eventStorage
	}
	
	public buildEventsCounterOfStatuses<BuildType extends EventBuildTypes>(
		arr: Array<ReturnEventTypeAfterBuild<BuildType>>,
	): EventCounterOfStatus {
		const counter: EventCounterOfStatus = {
			archive: 0,
			created: 0,
			completed: 0,
			in_work: 0,
			all: 0
		}
		
		arr.forEach((item) => {
			const s: Array<FilterTaskStatuses> = TaskFilteredStatusesObject[item.status]
			if (s) {
				s.forEach((filterStatus) => {
					counter[filterStatus]++
				})
			}
		})
		
		return counter
	}
	
	public buildEventsScheme<BuildType extends EventBuildTypes>(
		arr: Array<ReturnEventTypeAfterBuild<BuildType>>
	): EventSchemeResponse {
		let result: EventSchemeResponse = {}
		
		arr.forEach((event) => {
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
		
		return result
	}
}