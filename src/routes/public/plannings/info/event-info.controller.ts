import {
  CatchErrorHandler,
  ResponseException,
} from '../../../../exceptions/response.exception';
import { EventWidget } from '../../../../mongo/models/event-widget.model';
import { EventHelper } from '../events/helpers/event.helper';
import { updateEventResultMessagesMap } from './helpers/constants';
import { EventUpdateHelper } from './helpers/event-update.helper';
import {
  DefaultEventItemResponse,
  IGetEventInfoByEventIdResponse,
  InfoHandlerObject,
} from './types';

export const getEventInfoByEventId: InfoHandlerObject['getEventInfoByEventId'] =
  async (req, res) => {
    try {
      const { user, params } = req;
      const { eventId } = params;

      const eventHelper = new EventHelper(user);

      const event = await eventHelper.getEventWithCheckRoots(
        { _id: eventId },
        'viewer'
      );

      const resultEvent: DefaultEventItemResponse = await eventHelper
        .resolveEventsGroupAndBuild([event], 'viewer', 'Invite', 'default')
        .then((r) => r[0]);

      if (!resultEvent) {
        throw new ResponseException(
          ResponseException.createObject(
            404,
            'error',
            'Не удалось найти информацию по событию'
          )
        );
      }

      const returned: IGetEventInfoByEventIdResponse = {
        base: resultEvent,
        widget: null,
      };

      try {
        returned.widget = await EventWidget.findByEventId(resultEvent._id);
      } catch (e) {
        console.error(
          'Не удалось загрузить виджет по событию: ',
          resultEvent._id
        );
        console.error(e);
      }

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(returned)
      );

      return res.status(status).json(json);
    } catch (e) {
      console.error('error in get event info by event Id', e);
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  };

export const getShortEventsArray: InfoHandlerObject['getShortEventsArray'] =
  async (request, response) => {
    try {
      const { user, body } = request;

      const eventApi = new EventHelper(user);

      const eventsList = await eventApi.getShortEventsArray(body);

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(eventsList)
      );

      return response.status(status).json(json);
    } catch (e) {
      console.error(`error in ${request.url}: `, e);
      const { status, json } = CatchErrorHandler(e);
      return response.status(status).json(json);
    }
  };

export const getEventsStorage: InfoHandlerObject['getEventsAtScope'] = async (
  request,
  response
) => {
  try {
    const { user, body } = request;

    const finder = new EventHelper(user);

    const eventsList = await finder.getShortEventsArray(body);

    const eventsStorage = finder.buildEventsStorage(
      eventsList,
      body.utcOffset || 0,
      { fromDate: body.fromDate, toDate: body.toDate }
    );

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(eventsStorage)
    );

    return response.status(status).json(json);
  } catch (e) {
    console.error(`error in ${request.url}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};

export const getEventCounterOfStatuses: InfoHandlerObject['getEventCounterOfStatuses'] =
  async (request, response) => {
    try {
      const { user, body } = request;

      const finder = new EventHelper(user);
      //Перезаписываю eventStatus, чтобы не сужать поиск по статусам
      body.taskStatus = undefined;

      const eventsList = await finder.getShortEventsArray(body);

      const counter = finder.buildEventsCounterOfStatuses(eventsList);

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(counter)
      );

      return response.status(status).json(json);
    } catch (e) {
      console.error(`error in ${request.url}: `, e);
      const { status, json } = CatchErrorHandler(e);
      return response.status(status).json(json);
    }
  };

export const getEventsScheme: InfoHandlerObject['getEventsScheme'] = async (
  request,
  response
) => {
  try {
    const { user, body } = request;

    const finder = new EventHelper(user);

    const eventsList = await finder.getShortEventsArray(body);

    const scheme = finder.buildEventsScheme(eventsList, body.utcOffset || 0);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(scheme)
    );

    return response.status(status).json(json);
  } catch (e) {
    console.error(`error in ${request.url}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};

export const updateEventInfo: InfoHandlerObject['updateEventInfo'] = async (
  request,
  response
) => {
  try {
    const { user, body } = request;

    const eventUpdateApi = new EventUpdateHelper(user);

    await eventUpdateApi.updateEventInfoAndPushToHistory(body);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(
        null,
        updateEventResultMessagesMap[body.field]
      )
    );

    return response.status(status).json(json);
  } catch (e) {
    console.error(`error in ${request.url}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};
