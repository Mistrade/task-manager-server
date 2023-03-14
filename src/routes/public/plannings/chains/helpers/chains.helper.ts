import {
  EventModelType,
  EventModelWithPopulatedChains,
} from '../../../../../mongo/models/event.model';
import { HydratedDocument, Schema } from 'mongoose';
import { EventHelper } from '../../events/helpers/event.helper';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../../../exceptions/response.exception';
import { ResponseGetChainsByEventId } from '../types';
import { ShortEventItemResponse } from '../../info/types';
import { UserModelResponse } from '../../../session/types';

export class ChainsHelper {
  public user?: UserModelResponse;

  constructor(user?: UserModelResponse) {
    this.user = user;
  }

  public async getChainsByEventId(
    eventId: Schema.Types.ObjectId
  ): Promise<ResponseGetChainsByEventId> {
    EventHelper.checkEventId(eventId);

    const eventApi = new EventHelper(this.user);

    const event: HydratedDocument<EventModelWithPopulatedChains> =
      await eventApi
        .getEventWithCheckRoots<EventModelWithPopulatedChains>(
          { _id: eventId },
          'owner',
          [{ path: 'parentId' }, { path: 'linkedFrom' }]
        )
        .then((r) => r)
        .catch((e) => {
          const { status, json } = CatchErrorHandler(e);
          throw new ResponseException(
            status === 404
              ? ResponseException.createObject(
                  403,
                  'error',
                  'Событие не найдено или недостаточно прав доступа для просмотра связей события'
                )
              : ResponseException.createObject(
                  status,
                  json.info?.type || 'error',
                  json.info?.message ||
                    'Произошла непредвиденная ошибка при проверке события'
                )
          );
        });

    const obj: ResponseGetChainsByEventId = {
      linkedFrom: event.linkedFrom
        ? eventApi.buildShortEventResponseObject(event.linkedFrom)
        : null,
      parentEvent: event.parentId
        ? eventApi.buildShortEventResponseObject(event.parentId)
        : null,
      childrenEvents: [],
    };

    try {
      const childOfList: Array<HydratedDocument<EventModelType>> | null =
        await eventApi.getEventList({
          parentId: event._id,
        });

      if (!childOfList) {
        throw new ResponseException(
          ResponseException.createObject(
            500,
            'error',
            'Ошибка при поиска дочерних событий'
          )
        );
      }

      obj.childrenEvents = childOfList.map(
        (e): ShortEventItemResponse => eventApi.buildShortEventResponseObject(e)
      );
    } catch (e) {
      obj.childrenEvents = [];
    }

    return obj;
  }

  //
  // private parseParentEvents(event: EventModelTypeWithParentTrees) {
  // 		if(!event.parentId){
  // 			return null
  // 		}
  //
  // 		if('parentId' in event){
  // 			// event
  // 		}
  // }

  // private async getAllParentEvents(eventId: Schema.Types.ObjectId): Promise<Array<EventModelType>> {
  // 		if(!eventId){
  // 			throw new ResponseException(
  // 				ResponseException.createObject(400, 'error', 'На вход ожидался Id события')
  // 			)
  // 		}
  //
  // 		const event: HydratedDocument<EventModelTypeWithParentTrees> | null = await EventModel.findOne({
  // 			_id: eventId
  // 		}).populate('parentId')
  //
  // 		if(!event){
  // 			return []
  // 		}
  //
  //
  // }
}
