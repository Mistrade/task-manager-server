import { ByEventIdType, EventHandlerObject } from './types';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../../exceptions/response.exception';
import { SessionController } from '../../session/session.controller';
import { EventHelper } from './helpers/event.helper';
import { v4 } from 'uuid';
import dayjs from 'dayjs';
import {
  GroupModel,
  GroupsModelType,
} from '../../../../mongo/models/groups.model';
import { Schema } from 'mongoose';
import {
  EventModel,
  PriorityKeys,
  TaskStatusesType,
} from '../../../../mongo/models/event.model';

export const EventsController: EventHandlerObject = {
  async create(req, res) {
    try {
      //Получаю данные запроса
      const { user: userInfo, body } = req;

      //Проверяю сессию пользователя
      const user = new SessionController(userInfo).checkUser();

      //Запускаю ивент хелпер
      const eventHelper = new EventHelper(user);

      //Вызываю автоматизированный метод создания события create
      const createdEvent = await eventHelper.create(body);

      //После генерирую успешный объект для отправки
      const r = new ResponseException(
        ResponseException.createSuccessObject<ByEventIdType>({
          eventId: createdEvent._id,
        })
      );

      //Отвечаю успехом
      return res.status(r.status).json(r.json);
    } catch (e) {
      //Если где-то в методах произойдет ошибка - этот catch их поймает.
      //Выведет в консоль и вернет ответ
      console.error(req.url, e);
      const error = CatchErrorHandler<null>(e);

      return res.status(error.status).json(error.json);
    }
  },
  async remove(req, res) {
    try {
      const { user, body } = req;

      const eventHelper = new EventHelper(user);
      await eventHelper.remove({
        _id: body.eventId,
      });

      const result = new ResponseException(
        ResponseException.createSuccessObject(
          null,
          'Событие, комментарии и история события были успешно удалены'
        )
      );

      return res.status(result.status).json(result.json);
    } catch (e) {
      console.error('error in /events/remove', e);
      const result = CatchErrorHandler(e);
      return res.status(result.status).json(result.json);
    }
  },
  async generate(req, res) {
    try {
      interface GenerateEventType {
        priority: PriorityKeys;
        status: TaskStatusesType;
        time: Date;
        timeEnd: Date;
        title: string;
        type: string;
        userId: Schema.Types.ObjectId;
        group: Schema.Types.ObjectId | null;
        link: null;
      }

      const events: Array<GenerateEventType> = [];

      const count = 10_000;

      const years = [
        2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021,
        2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030,
      ];

      const groups: Array<GroupsModelType> | null = await GroupModel.find({
        type: { $ne: 'Invite' },
      });

      if (!groups) {
        throw new ResponseException(
          ResponseException.createObject(
            500,
            'error',
            'Не удалось получить список групп событий'
          )
        );
      }

      for (let i = 0; i < count; i++) {
        const randomYear =
          years[Math.round(Math.random() * (years.length - 1))] || 2031;
        const randomMonth = Math.round(Math.random() * 11);
        const randomDate = Math.round(Math.random() * 31);
        const randomHour = Math.round(Math.random() * 22);
        const minutes = 0;

        const time = dayjs()
          .set('year', randomYear)
          .set('month', randomMonth)
          .set('date', randomDate)
          .set('hour', randomHour)
          .set('minute', minutes);
        const timeEnd = time.add(1, 'hour');

        const randomGroup =
          groups[Math.round(Math.random() * (groups.length - 1))] || groups[0];

        const obj: GenerateEventType = {
          status: 'created',
          priority: 'medium',
          type: 'event',
          title: `random-event: ${v4()}`,
          time: time.toDate(),
          timeEnd: timeEnd.toDate(),
          link: null,
          group: randomGroup._id,
          userId: randomGroup.userId._id,
        };

        events.push(obj);
      }

      await EventModel.insertMany(events);

      const { json } = new ResponseException(
        ResponseException.createSuccessObject({ count: events.length })
      );

      return res.status(200).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  },
  async removeRandomEvents(req, res) {
    try {
      await EventModel.deleteMany({
        title: {
          $regex: `random-event`,
          $options: 'i',
        },
      });

      return res.status(200).json({ data: null });
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  },
};
