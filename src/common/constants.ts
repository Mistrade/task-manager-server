import {FilterTaskStatuses} from "../routes/EventsRouter/EventsRouter";
import {TaskStatusesType} from "../mongo/models/EventModel";

type TaskStatusesObjectProps = {
	[key in FilterTaskStatuses]: Array<TaskStatusesType>
}
export const TaskStatusesObject: TaskStatusesObjectProps = {
	in_work: ['created', 'in_progress', 'review'],
	completed: ['completed'],
	archive: []
}

export const colorRegExpDefault = /#[a-fA-F0-9]{3,6}$/gi
export const colorRegExpRGBA = /rgba?\(((25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,\s*?){2}(25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,?\s*([01]\.?\d*?)?\)/gi