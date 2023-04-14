import { UserModelResponse } from '../../session/types';
import { SessionController } from '../../session/session.controller';
import {
  CheckListUpdateCreateNewElementRequest,
  CheckListUpdateDeleteElementRequest,
  CheckListUpdateItemStateRequest,
  CheckListUpdateItemTitleRequest,
  CheckListUpdateMainTitleRequest,
  CheckListUpdateRequestData,
  ICreateCheckListItemProps,
  ICreateCheckListProps,
} from './types';
import validator from 'validator';
import { ResponseException } from '../../../../exceptions/response.exception';
import {
  CheckListModel,
  ICheckListSchema,
} from '../../../../mongo/models/check-list.model';
import { HydratedDocument, QueryOptions, Schema } from 'mongoose';
import {
  EventModel,
  EventModelType,
} from '../../../../mongo/models/event.model';
import { AnyObject } from '../history/helper/history.helper';

export class CheckListHelper {
  private user: UserModelResponse;

  constructor(user?: UserModelResponse) {
    this.user = new SessionController(user).checkUser();
  }

  private isValidMainTitle(title: string): boolean {
    return (
      typeof title === 'string' &&
      validator.isLength(title, {
        min: 3,
        max: 100,
      })
    );
  }

  private isValidItemTitle(title: string): boolean {
    return (
      typeof title === 'string' &&
      validator.isLength(title, {
        min: 1,
        max: 200,
      })
    );
  }

  public async updCheckListById(
    _id: Schema.Types.ObjectId,
    data: AnyObject,
    options?: QueryOptions
  ): Promise<HydratedDocument<ICheckListSchema> | null> {
    return CheckListModel.findOneAndUpdate({ _id }, data, options);
  }

  private async updateCheckListMainTitle(
    updData: CheckListUpdateMainTitleRequest
  ): Promise<HydratedDocument<ICheckListSchema> | null> {
    const isValidTitle = this.isValidMainTitle(updData.data);

    if (!isValidTitle) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Название чек листа должно быть строкой от 3 до 100 символов включительно'
        )
      );
    }

    return this.updCheckListById(updData._id, { title: updData.data });
  }

  private async updateCheckListItemTitle(
    updData: CheckListUpdateItemTitleRequest
  ): Promise<HydratedDocument<ICheckListSchema> | null> {
    const isValidTitle = this.isValidItemTitle(updData.data.value);

    if (!isValidTitle) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Название элемента чек листа должно быть строкой от 1 до 200 символов включительно'
        )
      );
    }

    return this.updCheckListById(
      updData._id,
      {
        $set: {
          'data.$[element].title': updData.data.value,
        },
      },
      { arrayFilters: [{ 'element._id': updData.data.itemId }] }
    );
  }

  private async updateCheckListItemState(
    updData: CheckListUpdateItemStateRequest
  ): Promise<HydratedDocument<ICheckListSchema> | null> {
    const isValidState = typeof updData.data.value === 'boolean';

    if (!isValidState) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Состояние элемента чек-листа должно быть true/false'
        )
      );
    }

    return this.updCheckListById(
      updData._id,
      {
        $set: {
          'data.$[element].state': updData.data.value,
        },
      },
      {
        arrayFilters: [{ 'element._id': updData.data.itemId }],
      }
    );
  }

  private async createNewElementInCheckList(
    updData: CheckListUpdateCreateNewElementRequest
  ): Promise<HydratedDocument<ICheckListSchema> | null> {
    const isValidTitle = this.isValidItemTitle(updData.data.title);

    if (!isValidTitle) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Название элемента чек листа должно быть строкой от 1 до 200 символов включительно'
        )
      );
    }

    const isValidState = typeof updData.data.state === 'boolean';

    if (!isValidState) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Состояние элемента чек-листа должно быть true/false'
        )
      );
    }

    return this.updCheckListById(updData._id, {
      $push: {
        data: updData.data,
      },
    });
  }

  private async removeElementFromCheckList(
    updData: CheckListUpdateDeleteElementRequest
  ): Promise<HydratedDocument<ICheckListSchema> | null> {
    if (!updData.data) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Сервер ожидал идентификатор элемента, но не получил его или получил невалидное значение.'
        )
      );
    }

    return this.updCheckListById(updData._id, {
      $pull: {
        data: {
          _id: updData.data,
        },
      },
    });
  }

  public async updateCheckList(
    data: CheckListUpdateRequestData
  ): Promise<HydratedDocument<ICheckListSchema> | null> {
    switch (data.fieldName) {
      case 'title':
        return this.updateCheckListMainTitle(data);
      case 'item-state':
        return this.updateCheckListItemState(data);
      case 'item-title':
        return this.updateCheckListItemTitle(data);
      case 'create':
        return this.createNewElementInCheckList(data);
      case 'delete':
        return this.removeElementFromCheckList(data);
      default:
        throw new ResponseException(
          ResponseException.createObject(
            400,
            'error',
            'Невалидные данные запроса на обновление чек-листа'
          )
        );
    }
  }

  public async getCheckListByEventId(
    eventId: Schema.Types.ObjectId
  ): Promise<null | ICheckListSchema> {
    if (!eventId) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Для запроса чек-листа не получен id события'
        )
      );
    }

    const event: EventModelType | null = await EventModel.findOne({
      _id: eventId,
    });

    if (!event) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Событие не найдено, для которого запрашивался чек-лист'
        )
      );
    }

    if (!event.checkList) {
      return null;
    }

    const checkList = await CheckListModel.findById(event.checkList);

    if (!checkList) {
      return null;
    }

    return checkList;
  }

  public async getCheckListById(
    _id: Schema.Types.ObjectId
  ): Promise<ICheckListSchema | null> {
    return CheckListModel.findById(_id);
  }

  public async associateCheckListWithEvent(
    checkListId: Schema.Types.ObjectId,
    eventId: Schema.Types.ObjectId
  ) {
    const checkListItem = await this.getCheckListById(checkListId);

    if (!checkListItem) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Не удалось найти чек-лист'
        )
      );
    }

    return EventModel.updateOne(
      { _id: eventId },
      { checkList: checkListItem._id }
    );
  }

  public async createCheckList(
    checkList: ICreateCheckListProps
  ): Promise<ICheckListSchema> {
    const isValidTitle = this.isValidMainTitle(checkList.title);

    if (!isValidTitle) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Название чек-листа должно быть не менее 3 символов и не более 100 символов '
        )
      );
    }

    const arr: Array<ICreateCheckListItemProps> = checkList.data.map(
      (item): ICreateCheckListItemProps => ({
        title: item.title,
        state: !!item.state,
      })
    );

    const result: ICheckListSchema | null = await CheckListModel.create({
      title: checkList.title,
      eventId: checkList.eventId,
      data: arr,
    });

    if (!result) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось создать чек-лист'
        )
      );
    }

    return result;
  }
}
