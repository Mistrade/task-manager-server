import {FilterTaskStatuses} from "../routes/EventsRouter/EventsRouter";
import {TaskStatusesType} from "../mongo/models/EventModel";

type TaskStatusesObjectProps = {
	[key in FilterTaskStatuses]: Array<TaskStatusesType>
}
const AllTaskStatusesWithoutArchive: Array<TaskStatusesType> = ['created', "completed", "review", 'in_progress']
export const TaskStatusesObject: TaskStatusesObjectProps = {
	created: ['created'],
	in_work: ['in_progress', 'review'],
	completed: ['completed'],
	archive: ['archive'],
	all: AllTaskStatusesWithoutArchive
}

type FilteredTaskStatusesType = {
	[key in TaskStatusesType]: Array<FilterTaskStatuses>
}

export const TaskFilteredStatusesObject = (() => {
	const result: FilteredTaskStatusesType = {
		archive: [],
		created: [],
		in_progress: [],
		completed: [],
		review: []
	}
	
	
	for (let key in TaskStatusesObject) {
		const values = TaskStatusesObject[key as FilterTaskStatuses]
		
		values.forEach((status) => {
			if (!result[status].includes(key as FilterTaskStatuses)) {
				result[status].push(key as FilterTaskStatuses)
			}
		})
	}
	
	return result
})()

export const colorRegExpDefault = /#[a-fA-F0-9]{3,6}$/i
export const colorRegExpRGBA = /rgba?\(((25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,\s*?){2}(25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,?\s*([01]\.?\d*?)?\)/i