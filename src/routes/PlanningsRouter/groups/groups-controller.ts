import {GroupControllerObject} from "./types";
import {CatchErrorHandler, ResponseException} from "../../../exceptions/ResponseException";
import {GroupHelper} from "./helpers/groupHelper";
import {GroupsRouter} from "./index";
import {GroupsModelType} from "../../../mongo/models/Group";
import {UserModelResponse} from "../../../common/transform/session/types";

export const getGroupInfoById: GroupControllerObject['getGroupInfoById'] = async (request, response) => {
	try {
		let {user, params: {groupId}} = request
		
		const groupApi = new GroupHelper(user)
		
		const groupItem = await groupApi.getGroup({
			_id: groupId,
			userId: groupApi.user._id
		})
		
		if (!groupItem) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Группа событий не найдена')
			)
		}
		
		const result = GroupHelper.buildGroupItemForResponse(groupItem)
		
		if (!result) {
			throw new ResponseException(
				ResponseException.createObject(500, 'error', 'Не удалось сформировать информацию о группе событий')
			)
		}
		
		const {status, json} = new ResponseException(
			ResponseException.createSuccessObject(result)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.error(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}

export const getGroupList: GroupControllerObject['getGroupList'] = async (request, response) => {
	try {
		let {user, body} = request
		
		const groupApi = new GroupHelper(user)
		
		const list = await groupApi.getGroupsList(body)
		
		const result = list
			.map((item): GroupsModelType<UserModelResponse> | null => GroupHelper.buildGroupItemForResponse(item))
			.filter((value): value is GroupsModelType<UserModelResponse> => !!value)
		
		const {status, json} = new ResponseException(
			ResponseException.createSuccessObject(result)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.error(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}

export const changeGroupIsSelect: GroupControllerObject['changeGroupIsSelect'] = async (request, response) => {
	try {
		let {user, body} = request
		
		const groupApi = new GroupHelper(user)
		
		await groupApi.changeSelectGroup(body)
		
		const {status, json} = new ResponseException(
			ResponseException.createSuccessObject(null)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.error(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}