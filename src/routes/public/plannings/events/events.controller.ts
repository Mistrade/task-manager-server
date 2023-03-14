import { ByEventIdType, EventHandlerObject } from './types';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../../exceptions/response.exception';
import { SessionController } from '../../session/session.controller';
import { EventHelper } from './helpers/event.helper';

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
};
