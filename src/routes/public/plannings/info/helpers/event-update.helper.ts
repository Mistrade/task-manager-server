import {
  UpdateEventGroup,
  UpdateEventIsLiked,
  UpdateEventLinkItem,
  UpdateEventMapTypes,
  UpdateEventPriority,
  UpdateEventStatus,
  UpdateEventTime,
  UpdateEventTitleOrDescription,
} from '../types';
import { EventValidator } from './event.validator';
import { ResponseException } from '../../../../../exceptions/response.exception';
import { EventHelper } from '../../events/helpers/event.helper';
import {
  EventModel,
  EventModelType,
} from '../../../../../mongo/models/event.model';
import { AnyObject, HistoryHelper } from '../../history/helper/history.helper';
import {
  EventHistoryCreateType,
  EventHistoryEditableFieldNames,
} from '../../../../../mongo/models/event-history.model';
import {
  DbTaskPriorities,
  DbTaskStatuses,
} from '../../../../../common/constants';
import { objectIdIsEquals } from '../../../../../common/common';
import {
  GroupModel,
  GroupsModelType,
} from '../../../../../mongo/models/groups.model';
import { HydratedDocument } from 'mongoose';
import dayjs from 'dayjs';
import { SessionController } from '../../../session/session.controller';
import { UserModelResponse } from '../../../session/types';

interface UpdateFnReturned {
  historyItems: Array<
    EventHistoryCreateType<EventHistoryEditableFieldNames>
  > | null;
  result: AnyObject;
}

export class EventUpdateHelper extends EventValidator {
  public user: UserModelResponse;

  constructor(user?: UserModelResponse) {
    super();
    this.user = new SessionController(user).checkUser();
  }

  private updateTitleOrDescription(
    value: UpdateEventTitleOrDescription,
    event: EventModelType
  ): UpdateFnReturned {
    const v =
      value.field === 'title'
        ? this.validateTitle(value.data)
        : this.validateDescription(value.data);

    if (!v) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          value.field === 'title'
            ? 'Заголовок события должен быть длинной от 5 до 80 символов включительно'
            : 'Описание может быть пустым или длинной не более 3000 символов включительно'
        )
      );
    }

    const historyApi = new HistoryHelper(this.user);

    if (value.field === 'title') {
      return {
        result: { title: value.data },
        historyItems: [
          historyApi.buildHistoryItem('title', event, {
            title: value.data,
          }),
        ],
      };
    }

    return {
      result: { description: value.data },
      historyItems: [
        historyApi.buildHistoryItem('description', event, {
          description: value.data,
        }),
      ],
    };
  }

  private updatePriority(
    value: UpdateEventPriority,
    event: EventModelType
  ): UpdateFnReturned {
    const v = !!DbTaskPriorities.includes(value.data);

    if (!v) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Некорректное значение поля: "Приоритет события"'
        )
      );
    }

    const historyApi = new HistoryHelper(this.user);

    return {
      result: { priority: value.data },
      historyItems: [
        historyApi.buildHistoryItem('priority', event, {
          priority: value.data,
        }),
      ],
    };
  }

  private updateStatus(
    value: UpdateEventStatus,
    event: EventModelType
  ): UpdateFnReturned {
    const v = !!DbTaskStatuses.includes(value.data);

    if (!v) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Некорректное значение поля: "Статус события"'
        )
      );
    }

    const historyApi = new HistoryHelper(this.user);

    return {
      result: { status: value.data },
      historyItems: [
        historyApi.buildHistoryItem('status', event, {
          status: value.data,
        }),
      ],
    };
  }

  private updateIsLiked(
    value: UpdateEventIsLiked,
    event: EventModelType
  ): UpdateFnReturned {
    if (typeof value.data !== 'boolean') {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Некорректное значение поля: "Добавить в избранное"'
        )
      );
    }

    const alreadyLiked =
      value.data &&
      !!event.likedUsers.find((like) => objectIdIsEquals(like, this.user._id));

    if (alreadyLiked) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Событие уже в списке "Избранное"'
        )
      );
    }

    const historyApi = new HistoryHelper(this.user);
    const description = value.data
      ? 'Добавлено в избранное'
      : 'Удалено из избранного';

    const result = value.data
      ? { $push: { likedUsers: this.user._id } }
      : { $pull: { likedUsers: this.user._id } };

    return {
      result,
      historyItems: [
        historyApi.buildHistoryItem(
          'isLiked',
          event,
          {
            isLiked: value.data,
          },
          {
            isPrivate: true,
            customDescription: description,
          }
        ),
      ],
    };
  }

  private async updateGroup(
    value: UpdateEventGroup,
    event: EventModelType
  ): Promise<UpdateFnReturned> {
    if (!objectIdIsEquals(event.userId._id, this.user._id)) {
      throw new ResponseException(
        ResponseException.createObject(
          403,
          'error',
          'Только создатель события может менять значение поля: "Группа событий"'
        )
      );
    }

    const groupFromDb: HydratedDocument<GroupsModelType> | null =
      await GroupModel.findOne({
        _id: value.data,
        userId: this.user._id,
      });

    if (!groupFromDb || !groupFromDb._id) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Не удалось найти группу событий, на которую необходимо обновить значение события'
        )
      );
    }

    if (groupFromDb.type === 'Invite') {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Вы не можете добавлять события в группу "Приглашения", в этой группе появляются события, когда другие пользователи дают вам доступ к своим событиям'
        )
      );
    }

    const historyApi = new HistoryHelper(this.user);

    return {
      result: { group: groupFromDb._id },
      historyItems: [
        historyApi.buildHistoryItem(
          'group',
          event,
          { group: groupFromDb._id },
          { isPrivate: true }
        ),
      ],
    };
  }

  private updateLink(
    value: UpdateEventLinkItem,
    event: EventModelType
  ): UpdateFnReturned {
    const v =
      value.data !== null
        ? //TODO Создать регулярку для проверки ссылки
          value.data.value.startsWith('http') && value.data.key !== ''
        : true;

    if (!v) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Некорректное значение поля: "Ссылка для подключения"'
        )
      );
    }

    const historyApi = new HistoryHelper(this.user);
    const description: string | undefined = !!value.data
      ? undefined
      : 'Ссылка для подключения была удалена';
    return {
      result: { link: value.data },
      historyItems: [
        historyApi.buildHistoryItem(
          'link',
          event,
          { link: value.data },
          { customDescription: description }
        ),
      ],
    };
  }

  private updateStartDate(
    value: UpdateEventTime,
    event: EventModelType
  ): UpdateFnReturned {
    const newStartTime = dayjs(value.data).utc();
    const v = newStartTime.isValid();

    if (!v) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Невалидная дата начала события'
        )
      );
    }

    const prevTimeEnd = dayjs(event.timeEnd).utc();
    const prevTimeStart = dayjs(event.time).utc();

    const historyApi = new HistoryHelper(this.user);

    if (newStartTime.isSameOrAfter(prevTimeEnd, 'second')) {
      const duration = prevTimeEnd.diff(prevTimeStart, 'minute');
      const newEndTime = newStartTime.add(duration, 'minute');

      const resultTime = newStartTime.utc().toDate();
      const resultTimeEnd = newEndTime.utc().toDate();

      const description = `Дата завершения события была изменена, так как новое значение начала события было после завершения события.
						 Разница во времени осталась прежней: ${duration} минут.`;
      return {
        result: {
          time: resultTime,
          timeEnd: resultTimeEnd,
        },
        historyItems: [
          historyApi.buildHistoryItem('time', event, { time: resultTime }),
          historyApi.buildHistoryItem(
            'timeEnd',
            event,
            { timeEnd: resultTimeEnd },
            { customDescription: description }
          ),
        ],
      };
    }

    const resultTime = newStartTime.toDate();

    return {
      result: { time: resultTime },
      historyItems: [
        historyApi.buildHistoryItem('time', event, {
          time: resultTime,
        }),
      ],
    };
  }

  private updateEndDate(
    value: UpdateEventTime,
    event: EventModelType
  ): UpdateFnReturned {
    const newEndTime = dayjs(value.data).utc();
    const v = newEndTime.isValid();
    if (!v) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Некорректная дата завершения события'
        )
      );
    }

    const prevStartTime = dayjs(event.time);

    if (newEndTime.isSameOrBefore(prevStartTime, 'second')) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Дата завершения должна быть после даты начала события. Измените сначала дату начала события.'
        )
      );
    }

    const resultEndTime = newEndTime.toDate();
    const historyApi = new HistoryHelper(this.user);

    return {
      result: { timeEnd: resultEndTime },
      historyItems: [
        historyApi.buildHistoryItem('timeEnd', event, {
          timeEnd: resultEndTime,
        }),
      ],
    };
  }

  public async updateEventInfoAndPushToHistory(
    value: UpdateEventMapTypes
  ): Promise<void> {
    const { id, field, data } = value;

    const _ = new EventHelper(this.user);

    const event = await _.getEventWithCheckRoots({ _id: id }, 'editor');

    if (!event) {
      throw new ResponseException(
        ResponseException.createObject(
          403,
          'error',
          'Недостаточно прав доступа для редактирования этого события'
        )
      );
    }

    let result: UpdateFnReturned | null = null;

    switch (field) {
      case 'title':
        result = this.updateTitleOrDescription(value, event);
        break;
      case 'description':
        result = this.updateTitleOrDescription(value, event);
        break;
      case 'priority':
        result = this.updatePriority(value, event);
        break;
      case 'status':
        result = this.updateStatus(value, event);
        break;
      case 'isLiked':
        result = this.updateIsLiked(value, event);
        break;
      case 'group':
        result = await this.updateGroup(value, event);
        break;
      case 'link':
        result = this.updateLink(value, event);
        break;
      case 'time':
        result = this.updateStartDate(value, event);
        break;
      case 'timeEnd':
        result = this.updateEndDate(value, event);
        break;
      default:
        result = null;
        break;
    }

    if (result && result.result && Object.keys(result.result).length > 0) {
      try {
        await EventModel.updateOne({ _id: id }, { ...result.result });
      } catch (e) {
        throw new ResponseException(
          ResponseException.createObject(
            500,
            'error',
            'Не удалось сохранить изменения'
          )
        );
      }

      if (result.historyItems && result.historyItems?.length > 0) {
        const historyApi = new HistoryHelper(this.user);
        try {
          await historyApi.addToHistory(result.historyItems);
        } catch (e) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              'Не удалось зафиксировать историю события'
            )
          );
        }
      }
    }
  }
}
