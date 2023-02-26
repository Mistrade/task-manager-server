import {AuthRequest} from "../index";
import {Schema} from "mongoose";
import {ApiResponse} from "../../types";
import {GroupsModelType} from "../../../mongo/models/Group";
import {UserModelResponse} from "../../../common/transform/session/types";

export interface GetGroupListRequestProps {
	exclude?: Array<GroupsModelType['type']>
}

export interface ChangeGroupSelectRequestProps {
	groupId: Schema.Types.ObjectId,
	state: boolean
}

export interface GroupControllerObject {
	getGroupInfoById(
		request: AuthRequest<null, {groupId: Schema.Types.ObjectId}>,
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
}