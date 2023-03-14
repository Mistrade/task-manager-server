import { FilterTaskStatuses } from '../routes/public/plannings/types';
import { TaskStatusesType } from '../mongo/models/event.model';

export type CustomObject<T = any> = { [key in string]: T };
export type TaskStatusesObjectProps = {
  [key in FilterTaskStatuses]: Array<TaskStatusesType>;
};
export type FilteredTaskStatusesType = {
  [key in TaskStatusesType]: Array<FilterTaskStatuses>;
};
