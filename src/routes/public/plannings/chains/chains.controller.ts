import { ConnectChildrenEventFn, GetChainsByEventIdFn } from './types';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../../exceptions/response.exception';
import { ChainsHelper } from './helpers/chains.helper';
import { SessionController } from '../../session/session.controller';
import {
  EventModel,
  EventModelType,
} from '../../../../mongo/models/event.model';
import { EventHelper } from '../events/helpers/event.helper';
import { HydratedDocument, Schema } from 'mongoose';
import { TreeValidator } from './helpers/tree.validator';
import { HistoryHelper } from '../history/helper/history.helper';

export const getChainsByEventId: GetChainsByEventIdFn = async (
  request,
  response
) => {
  try {
    const { user, params } = request;

    const chainsApi = new ChainsHelper(user);

    const result = await chainsApi.getChainsByEventId(params.eventId);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(result)
    );

    return response.status(status).json(json);
  } catch (e) {
    console.log(`error in ${request.originalUrl}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};

//Логика метода
//Сначала - проверяй входные данные - есть они или нет.
//Проверяю ограничения.
//Если с входными данными все ок - ищу в базе родительское событие и добавляемые события (currentEvent и addedEvents соответственно)
//Проверяю что данные пришли.
//
//Возможные кейсы:
//1. У текущего события нет дерева и у всех добавляемых событий нет деревьев.
//2. У текущего события есть дерево и у всех добавляемых событий нет деревьев.
//3. У текущего события нет дерева и хотя бы одно добавляемое событие имеет дерево.
//4. У текущего события есть дерево, и хотя бы одно добавляемое событие имеет дерево, деревья не пересекаются
//7. У текущего события есть дерево, и одно или несколько добавляемых событий имеет дерево, при этом есть пересечения по деревьям между родителем и добавляемыми событиями
//
//Решение:
//1. У текущего события нет дерева и у всех добавляемых событий нет деревьев.
// Краткое описание:
// * Конфликтов может быть если текущее событие находится в добавляемых. Валидация нужна.
// Валидация:
// * Проверяю что в добавляемых событиях нет текущего события
// Действия:
// * Провожу валидацию.
// * Создаю дерево.
// * Отправляю запрос на обновление событий: [(treeId для всех), (parentId для дочерних)].
// * Формирую записи в историю.
//
//2. У текущего события есть дерево и у всех добавляемых событий нет деревьев.
// Краткое описание:
// * Конфликтов нет. Валидация не нужна.
// Действия:
// * Отправляю запрос на обновление событий: treeId и parentId для дочерних.
// * Формирую записи в историю.
//
//3. У текущего события нет дерева и хотя бы одно добавляемое событие имеет дерево.
// Краткое описание:
// * Конфликты могут быть, если текущее событие находится в добавляемых. Валидация нужна
// Валидация:
// * Проверяю, что в добавляемых событиях нет текущего события.
// Действия:
// * Провожу валидацию.
// * Получаю список событий, содержащиеся в деревьях, которые указаны в добавляемых событиях.
// * Пробегаюсь по всему списку полученных событий и формирую плоскую модель списка событий, содержавшихся в деревьях, типа {treeId: Array<EventsInTreeId>}.
// * Иду по добавляемым событиям и формирую плоскую модель деревьев. При формировании деревьев использую предыдущую модель, оттуда беру списки событий,
// 	 На каждой итерации из дерева вытаскиваю все дочерние события из объекта path.eventId.childs,
// 	 По итогу должен получиться массив из всех событий, которые нужно обновить, учитывая детей добавляемых событий.
// * Создаю дерево.
// * Отправляю запрос на обновление событий [(treeId для добавляемых и текущего), (parentId для добавляемых)]
// * Формирую записи в историю для текущего и полученных добавляемых событий (без учета детей добавляемых)
//
//4. и 5. У текущего события есть дерево, и хотя бы одно добавляемое событие имеет дерево, деревья (не) пересекаются.
// Краткое описание:
// * Конфликты могут быть, если текущие событие находится в добавляемых
// * или у одного из добавляемых событий такой же treeId как у текущего. Валидация нужна.
// Валидация:
// * Проверяю, что в добавляемых событиях нет текущего события. (exception)
// * Проверяю, что нет пересечений между деревьями текущего события и добавляемых событий. (go_next)
// * Если пересечения есть, то в момент построения деревьев добавляемых событий нужно проверять пересечение деревьев
//   и если оно пересекается сравнивать конфликты у родителей текущего события и детей добавляемого события, включая само добавляемое событие
// Действия:
// * Провожу валидацию.
// * Получаю список событий, содержащиеся в деревья, которые указаны в добавляемых событиях.
// * Пробегаюсь по всему списку полученных событий и формирую плоскую модель списка событий, содержавшихся в деревьях, типа {treeId: Array<EventsInTreeId>}.
// * Иду по добавляемым событиям и формирую модель деревьев. При формировании деревьев использую предыдущую модель, оттуда беру списки событий,
// 	 На каждой итерации из дерева вытаскиваю все дочерние события из объекта path.eventId.childs и если в результате валидации были пересечения treeId,
// 	 то проверяю есть ли пересечения между родителями текущего события и событиями, которые лежат в path.eventId.childs.
// 	 Если пересечения есть возвращаю ошибку с id события, в которых были ошибки.
//   По итогу должен получиться массив из всех событий, которые нужно обновить, учитывая детей добавляемых событий.
// * Отправляю запрос на обновление событий [(treeId для добавляемых и текущего), (parentId для добавляемых)]
// * Формирую записи в историю для текущего и полученных добавляемых событий (без учета детей добавляемых)
export const connectChildrenEvent: ConnectChildrenEventFn = async (
  req,
  res
) => {
  try {
    let { user } = req;
    user = new SessionController(user).checkUser();
    const { body } = req;
    const { eventId, eventsToAdd } = body;

    if (!eventsToAdd || !eventsToAdd.length || !eventId) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'warning',
          'Нечего добавлять. Выберите события, для которых необходимо установить childOf связь'
        )
      );
    }

    if (eventsToAdd.length > 5) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'За одну транзакцию можно добавить не более 5 дочерних событий'
        )
      );
    }

    const hasIntersection = eventsToAdd.filter(
      (item) => item && item.toString() === eventId.toString()
    );

    if (hasIntersection.length) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Вы пытаетесь добавить к событию в качестве дочернего само себя.'
        )
      );
    }

    const eventApi = new EventHelper(user);

    const currentEvent: HydratedDocument<EventModelType> | null =
      await eventApi.getEventWithCheckRoots(
        {
          _id: eventId,
        },
        'owner'
      );

    if (!currentEvent) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Родительское событие не найдено или вы не являетесь его владельцем'
        )
      );
    }

    const addedEvents: Array<EventModelType> | null = await EventModel.find({
      _id: { $in: eventsToAdd },
      ...eventApi.buildMinimalRootsFilter('owner'),
    });

    if (!addedEvents || !addedEvents.length) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Добавляемые события не найдены или вы не являетесь их владельцем'
        )
      );
    }

    const eventsForUpdate: Array<string> = await new TreeValidator(user)
      .getAllEventsForUpdate(currentEvent, addedEvents)
      .then((r) => r)
      .catch((reason) => {
        const err = CatchErrorHandler(reason);
        throw new ResponseException(err);
      });

    const treeId: Schema.Types.ObjectId =
      await TreeValidator.getTreeIdForUpdate(currentEvent.treeId, user);
    const historyApi = new HistoryHelper(user);

    const history = [
      ...addedEvents.map((item) => {
        return historyApi.buildHistoryItem('parentEvent', item, {
          parentEvent: historyApi.getSnapshotRequiredFields(currentEvent),
        });
      }),
      historyApi.buildHistoryItem('insertChildOfEvents', currentEvent, {
        insertChildOfEvents: addedEvents.map((item) =>
          historyApi.getSnapshotRequiredFields(item)
        ),
      }),
    ];

    const parentsWhoLoseChildren = addedEvents
      .map((item) => item.parentId)
      .filter((value): value is Schema.Types.ObjectId => !!value);

    if (parentsWhoLoseChildren.length > 0) {
      const parentsForRemovedChildren: Array<EventModelType> | null =
        await EventModel.find({
          _id: { $in: parentsWhoLoseChildren },
        });

      if (!parentsForRemovedChildren) {
        throw new ResponseException(
          ResponseException.createObject(
            404,
            'error',
            'Не удалось найти родителей добавляемых событий, чтобы разорвать с ними связь'
          )
        );
      }

      history.push(
        ...parentsForRemovedChildren.map((item) => {
          return historyApi.buildHistoryItem('removeChildOfEvents', item, {
            removeChildOfEvents: addedEvents
              .filter((child) => child.parentId === item._id)
              .map((child) => historyApi.getSnapshotRequiredFields(child)),
          });
        })
      );
    }

    const resultEventsIds: Array<string> = [
      ...eventsForUpdate,
      currentEvent._id.toString(),
    ];

    await EventModel.updateMany({ _id: { $in: resultEventsIds } }, { treeId });
    await EventModel.updateMany(
      { _id: { $in: eventsForUpdate } },
      { parentId: currentEvent._id }
    );
    await historyApi.addToHistory(history);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(null)
    );

    return res.status(status).json(json);
  } catch (e) {
    console.log(`error in ${req.originalUrl}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return res.status(status).json(json);
  }
};
