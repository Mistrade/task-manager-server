import { UpdateEventMapTypes } from '../types';

export const updateEventResultMessagesMap: {
  [key in UpdateEventMapTypes['field']]: string;
} = {
  priority: 'Приоритет события успешно обновлен',
  time: 'Время начала события успешно обновлено',
  timeEnd: 'Время завершения события успешно обновлено',
  title: 'Заголовок события успешно обновлен',
  description: 'Описание события успешно обновлено',
  isLiked: 'Событие добавлено/удалено в(из) избранно(е|го)',
  status: 'Статус события успешно обновлен',
  group: 'Группа событий успешно обновлена',
  link: 'Ссылка события успешно обновлена',
};
