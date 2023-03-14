import { GroupControllerObject } from './types';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../../exceptions/response.exception';
import { GroupsHelper } from './helpers/groups.helper';
import { GroupsModelType } from '../../../../mongo/models/groups.model';
import { UserModelResponse } from '../../session/types';

export const getGroupInfoById: GroupControllerObject['getGroupInfoById'] =
  async (request, response) => {
    try {
      let {
        user,
        params: { groupId },
      } = request;

      const groupApi = new GroupsHelper(user);

      const groupItem = await groupApi.getGroup({
        _id: groupId,
        userId: groupApi.user._id,
      });

      if (!groupItem) {
        throw new ResponseException(
          ResponseException.createObject(
            404,
            'error',
            'Группа событий не найдена'
          )
        );
      }

      const result = GroupsHelper.buildGroupItemForResponse(groupItem);

      if (!result) {
        throw new ResponseException(
          ResponseException.createObject(
            500,
            'error',
            'Не удалось сформировать информацию о группе событий'
          )
        );
      }

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(result)
      );

      return response.status(status).json(json);
    } catch (e) {
      console.error(`error in ${request.originalUrl}: `, e);
      const { status, json } = CatchErrorHandler(e);
      return response.status(status).json(json);
    }
  };

export const getGroupList: GroupControllerObject['getGroupList'] = async (
  request,
  response
) => {
  try {
    let { user, body } = request;

    const groupApi = new GroupsHelper(user);

    const list = await groupApi.getGroupsList(body);

    const result = list
      .map((item): GroupsModelType<UserModelResponse> | null =>
        GroupsHelper.buildGroupItemForResponse(item)
      )
      .filter((value): value is GroupsModelType<UserModelResponse> => !!value);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(result)
    );

    return response.status(status).json(json);
  } catch (e) {
    console.error(`error in ${request.originalUrl}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};

export const changeGroupIsSelect: GroupControllerObject['changeGroupIsSelect'] =
  async (request, response) => {
    try {
      let { user, body } = request;

      const groupApi = new GroupsHelper(user);

      await groupApi.changeSelectGroup(body);

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(null)
      );

      return response.status(status).json(json);
    } catch (e) {
      console.error(`error in ${request.originalUrl}: `, e);
      const { status, json } = CatchErrorHandler(e);
      return response.status(status).json(json);
    }
  };

export const createGroup: GroupControllerObject['createGroup'] = async (
  request,
  response
) => {
  try {
    let { user, body } = request;

    const groupApi = new GroupsHelper(user);

    const group = await groupApi.create(body);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(group)
    );

    return response.status(status).json(json);
  } catch (e) {
    console.error(`error in ${request.originalUrl}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};

export const removeGroup: GroupControllerObject['removeGroup'] = async (
  request,
  response
) => {
  try {
    let {
      user,
      body: { groupId },
    } = request;

    const groupApi = new GroupsHelper(user);

    await groupApi.remove(groupId);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(null)
    );

    return response.status(status).json(json);
  } catch (e) {
    console.error(`error in ${request.originalUrl}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};

export const updateGroupInfo: GroupControllerObject['updateGroupInfo'] = async (
  request,
  response
) => {
  try {
    let { user, body } = request;

    const groupApi = new GroupsHelper(user);

    await groupApi.updateGroupInfo(body.groupId, body);

    const { status, json } = new ResponseException(
      ResponseException.createSuccessObject(null)
    );

    return response.status(status).json(json);
  } catch (e) {
    console.error(`error in ${request.originalUrl}: `, e);
    const { status, json } = CatchErrorHandler(e);
    return response.status(status).json(json);
  }
};
