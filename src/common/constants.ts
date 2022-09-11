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