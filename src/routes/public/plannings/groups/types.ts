import { Schema } from 'mongoose';
import { ApiResponse } from '../../../types';
import {
  GroupsModelResponse,
  GroupsModelType,
} from '../../../../mongo/models/groups.model';
import { AuthRequest } from '../types';
import { UserModelResponse } from '../../session/types';

export interface GetGroupListRequestProps {
  exclude?: Array<GroupsModelType['type']>;
}

export interface ChangeGroupSelectRequestProps extends GroupIdObject {
  state: boolean;
}

export interface CreateGroupProps {
  title: string;
  color: string;
}

export interface UpdateGroupProps extends CreateGroupProps, GroupIdObject {}

export interface GroupIdObject {
  groupId: Schema.Types.ObjectId;
}

export interface GroupControllerObject {
  getGroupInfoById(
    request: AuthRequest<null, GroupIdObject>,
    response: ApiResponse<GroupsModelType<UserModelResponse>>
  ): Promise<ApiResponse<GroupsModelType<UserModelResponse>>>;

  getGroupList(
    request: AuthRequest<GetGroupListRequestProps>,
    response: ApiResponse<Array<GroupsModelType<UserModelResponse>>>
  ): Promise<ApiResponse<Array<GroupsModelType<UserModelResponse>>>>;

  changeGroupIsSelect(
    request: AuthRequest<ChangeGroupSelectRequestProps>,
    response: ApiResponse
  ): Promise<ApiResponse>;

  createGroup(
    request: AuthRequest<CreateGroupProps>,
    response: ApiResponse<GroupsModelResponse>
  ): Promise<ApiResponse<GroupsModelResponse>>;

  removeGroup(
    request: AuthRequest<GroupIdObject>,
    response: ApiResponse
  ): Promise<ApiResponse>;

  updateGroupInfo(
    request: AuthRequest<UpdateGroupProps>,
    response: ApiResponse
  ): Promise<ApiResponse>;
}