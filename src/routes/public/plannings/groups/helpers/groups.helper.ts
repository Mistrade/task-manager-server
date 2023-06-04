import { HydratedDocument, Types } from 'mongoose';
import { ResponseException } from '../../../../../exceptions/response.exception';
import { UserModelHelper } from '../../../../../mongo/helpers/user.helper';
import {
  GroupModel,
  GroupsModelResponse,
  GroupsModelType,
} from '../../../../../mongo/models/groups.model';
import { UserModelType } from '../../../../../mongo/models/user.model';
import { SessionController } from '../../../session/session.controller';
import { UserModelResponse } from '../../../session/types';
import { EventHelper } from '../../events/helpers/event.helper';
import {
  ChangeGroupSelectRequestProps,
  CreateGroupProps,
  GetGroupListRequestProps,
} from '../types';
import { GroupsValidator } from './groups.validator';

export type MongoFilters<T extends object> = {
  [key in keyof T]?: T[key];
} & {
  [key in string]?: any;
};

export class GroupsHelper extends GroupsValidator {
  public user: UserModelResponse;

  constructor(user?: UserModelResponse) {
    super();
    this.user = new SessionController(user).checkUser();
  }

  public async changeSelectGroup(values: ChangeGroupSelectRequestProps) {
    await GroupModel.updateOne<GroupsModelType>(
      {
        _id: values.groupId,
        userId: this.user._id,
      },
      {
        isSelected: values.state,
      }
    );
  }

  public async getGroupsList(
    options: GetGroupListRequestProps
  ): Promise<Array<GroupsModelType>> {
    const list: Array<GroupsModelType> | null = await GroupModel.find({
      userId: this.user._id,
      type: {
        $nin: options?.exclude || [],
      },
    });

    if (!list) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Группы событий не найдены'
        )
      );
    }

    return list;
  }

  public static buildGroupItemForResponse(
    groupItem: GroupsModelType | null
  ): GroupsModelResponse | null {
    if (!groupItem) {
      return null;
    }

    return {
      _id: groupItem._id,
      userId: UserModelHelper.getPopulatedUserWithoutPassword(groupItem.userId),
      editable: groupItem.editable,
      type: groupItem.type,
      title: groupItem.title,
      created: groupItem.created,
      deletable: groupItem.deletable,
      isSelected: groupItem.isSelected,
      color: groupItem.color,
    };
  }

  public async getGroup(
    filters?: MongoFilters<GroupsModelType<Types.ObjectId>>
  ): Promise<HydratedDocument<GroupsModelType>> {
    const result: HydratedDocument<GroupsModelType<UserModelType>> | null =
      await GroupModel.findOne({
        userId: this.user._id,
        ...filters,
      });

    if (!result) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось найти группу событий'
        )
      );
    }

    return result;
  }

  public async resolveGroup(
    groupId?: Types.ObjectId
  ): Promise<HydratedDocument<GroupsModelType>> {
    if (!groupId) {
      return await this.getGroup({
        type: 'Main',
      });
    }

    try {
      return await this.getGroup({
        _id: groupId,
      });
    } catch (e) {
      return await this.getGroup({
        type: 'Main',
      });
    }
  }

  public async getSelectedGroups(): Promise<
    { result: Array<HydratedDocument<GroupsModelType>> } & GroupsHelper
  > {
    const result: Array<HydratedDocument<GroupsModelType>> | null =
      await GroupModel.find({
        userId: this.user._id,
        isSelected: true,
      });

    if (!result) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Не удалось найти активные группы событий'
        )
      );
    }

    return {
      ...this,
      result,
    };
  }

  public async create(data: CreateGroupProps): Promise<GroupsModelResponse> {
    const { title, color } = data;

    const resultValidate =
      this.validateGroupTitle(title) && this.validateGroupColor(color);

    if (!resultValidate) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Некорректные входные параметры для создания группы событий'
        )
      );
    }

    const createdGroup: HydratedDocument<GroupsModelType> | null =
      await GroupModel.create({
        title: title.trim(),
        color: color,
        editable: true,
        deletable: true,
        isSelected: true,
        type: 'Custom',
        userId: this.user._id,
      });

    if (!createdGroup) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось создать группу событий'
        )
      );
    }

    const resultGroup = GroupsHelper.buildGroupItemForResponse(createdGroup);

    if (!resultGroup) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Группа событий была создана, но произошла непредвиденная ошибка при формировании ответа'
        )
      );
    }

    return resultGroup;
  }

  public async remove(groupId: Types.ObjectId): Promise<void> {
    const groupItem = await GroupModel.findOne({
      userId: this.user._id,
      _id: groupId,
      deletable: true,
    });

    if (!groupItem) {
      throw new ResponseException(
        ResponseException.createObject(
          403,
          'error',
          'Вы не можете удалить эту группу событий'
        )
      );
    }

    const eventApi = new EventHelper(this.user);

    const eventsInGroup = await eventApi.getEventList({
      group: groupId,
    });

    if (eventsInGroup.length) {
      await eventApi.remove({
        group: groupId,
      });
    }

    await GroupModel.deleteOne({
      _id: groupId,
    });
  }

  public async updateGroupInfo(
    groupId: Types.ObjectId,
    props: CreateGroupProps
  ) {
    const { title, color } = props;

    const validate =
      this.validateGroupTitle(title) && this.validateGroupColor(color);

    if (!validate) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'Невалидное значение цвета или заголовка'
        )
      );
    }

    const group: HydratedDocument<GroupsModelType> | null =
      await GroupModel.findOne({
        _id: groupId,
      });

    if (!group) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          'Группа событий для обновления не найдена'
        )
      );
    }

    if (!group.editable) {
      throw new ResponseException(
        ResponseException.createObject(
          403,
          'error',
          'Эту группу событий нельзя редактировать'
        )
      );
    }

    if (group.title.trim() === title.trim() && group.color === color) {
      throw new ResponseException(
        ResponseException.createObject(400, 'error', 'Изменений не выявлено')
      );
    }

    group.title = title.trim();
    group.color = color;

    await group.save();
  }
}
