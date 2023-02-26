import {Schema} from "mongoose";
import {ApiResponse} from "../../types";
import {GroupsModelResponse, GroupsModelType} from "../../../mongo/models/Group";
import {UserModelResponse} from "../../../common/transform/session/types";
import {AuthRequest} from "../types";

export interface GetGroupListRequestProps {
	exclude?: Array<GroupsModelType['type']>
}

export interface ChangeGroupSelectRequestProps {
	groupId: Schema.Types.ObjectId,
	state: boolean
}

export interface CreateGroupProps {
	title: string,
	color: string,
}

export interface UpdateGroupProps extends CreateGroupProps {
	groupId: Schema.Types.ObjectId
}

export interface GroupControllerObject {
	getGroupInfoById(
		request: AuthRequest<null, { groupId: Schema.Types.ObjectId }>,
		response: ApiResponse<GroupsModelType<UserModelResponse>>
	): Promise<ApiResponse<GroupsModelType<UserModelResponse>>>,
	
	getGroupList(
		request: AuthRequest<GetGroupListRequestProps>,
		response: ApiResponse<Array<GroupsModelType<UserModelResponse>>>
	): Promise<ApiResponse<Array<GroupsModelType<UserModelResponse>>>>
	
	changeGroupIsSelect(
		request: AuthRequest<ChangeGroupSelectRequestProps>,
		response: ApiResponse
	): Promise<ApiResponse>
	
	createGroup(
		request: AuthRequest<CreateGroupProps>,
		response: ApiResponse<GroupsModelResponse>
	): Promise<ApiResponse<GroupsModelResponse>>
	
	removeGroup(
		request: AuthRequest<{groupId: Schema.Types.ObjectId}>,
		response: ApiResponse
	): Promise<ApiResponse>
	
	updateGroupInfo(
		request: AuthRequest<UpdateGroupProps>,
		response: ApiResponse
	): Promise<ApiResponse>
}