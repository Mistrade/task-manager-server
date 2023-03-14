import { PriorityKeys, TaskStatusesType } from '../mongo/models/event.model';
import { EventHistoryEditableFieldNames } from '../mongo/models/event-history.model';
import { AccessRightsWithOwner } from '../mongo/models/event-invite.model';
import { FilterTaskStatuses } from '../routes/public/plannings/types';
import {
  FilteredTaskStatusesType,
  TaskStatusesObjectProps,
} from './common.types';

const AllTaskStatusesWithoutArchive: Array<TaskStatusesType> = [
  'created',
  'completed',
  'review',
  'in_progress',
];

export const TaskStatusesObject: TaskStatusesObjectProps = {
  created: ['created'],
  in_work: ['in_progress', 'review'],
  completed: ['completed'],
  archive: ['archive'],
  all: AllTaskStatusesWithoutArchive,
};

export const TaskFilteredStatusesObject = (() => {
  const result: FilteredTaskStatusesType = {
    archive: [],
    created: [],
    in_progress: [],
    completed: [],
    review: [],
  };

  for (let key in TaskStatusesObject) {
    const values = TaskStatusesObject[key as FilterTaskStatuses];

    values.forEach((status) => {
      if (!result[status].includes(key as FilterTaskStatuses)) {
        result[status].push(key as FilterTaskStatuses);
      }
    });
  }

  return result;
})();

export const colorRegExpDefault = /#[a-fA-F0-9]{3,6}$/i;
export const colorRegExpRGBA =
  /rgba?\(((25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,\s*?){2}(25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,?\s*([01]\.?\d*?)?\)/i;

export const DbTaskStatuses: Array<TaskStatusesType> = [
  'created',
  'in_progress',
  'review',
  'completed',
  'archive',
];

export const DbTaskPriorities: Array<PriorityKeys> = [
  'veryHigh',
  'high',
  'medium',
  'low',
  'veryLow',
];

export const HistoryDescription: {
  [key in EventHistoryEditableFieldNames]: string;
} = {
  createdAt: 'Событие создано',
  group: 'Изменена группа, за которой закреплено событие',
  description: 'Изменено описание события',
  sendInvites: 'К событию были добавлены участники',
  insertChildOfEvents: 'К событию были привязаны дочерние события',
  closeInvites: 'Участник(-и) были исключены из события',
  removeChildOfEvents: 'Удалена связь с дочерними событиями',
  originalEventId: 'Изменен идентификатор оригинального события',
  type: 'Изменен тип события',
  time: 'Изменено время начала события',
  timeEnd: 'Изменено время завершения события',
  title: 'Изменен заголовок',
  isLiked: 'Событие Добавлено/удалено из избранного',
  link: 'Изменена ссылка события',
  parentEvent: 'Изменено родительского событие',
  linkedFrom: 'Событие было клонировано от другого события',
  user: 'Изменен владелец события',
  status: 'Изменен статус события',
  priority: 'Изменен приоритет события',
};

export const minimalRootsMap: {
  [key in AccessRightsWithOwner]: Array<AccessRightsWithOwner>;
} = {
  viewer: ['viewer', 'editor', 'admin', 'owner'],
  editor: ['editor', 'admin', 'owner'],
  admin: ['admin', 'owner'],
  owner: ['owner'],
};
