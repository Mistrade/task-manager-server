import {UserModelResponse} from "../../../../common/transform/session/types";
import {SessionHandler} from "../../../SessionRouter/SessionHandler";
import {GroupModel, GroupsModelResponse, GroupsModelType} from "../../../../mongo/models/Group";
import {HydratedDocument, Schema} from "mongoose";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {UserModelHelper} from "../../../../mongo/helpers/User";
import {UserModel} from "../../../../mongo/models/User";
import {ChangeGroupSelectRequestProps, GetGroupListRequestProps} from "../types";

export type MongoFilters<T extends object> = {
	[key in keyof T]?: T[key]
} & {
	[key in string]?: any
}


export class GroupHelper {
	public user: UserModelResponse
	
	constructor(user?: UserModelResponse) {
		this.user = new SessionHandler(user).checkUser()
	}
	
	public async changeSelectGroup(values: ChangeGroupSelectRequestProps){
		await GroupModel.updateOne<GroupsModelType>({
			_id: values.groupId,
			userId: this.user._id
		}, {
			isSelected: values.state
		})
	}
	
	public async getGroupsList (options: GetGroupListRequestProps): Promise<Array<GroupsModelType>> {
		
		const list: Array<GroupsModelType> | null = await GroupModel.find({
			userId: this.user._id,
			type: {
				$nin: options?.exclude || []
			}
		})
		
		if(!list) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Группы событий не найдены')
			)
		}
		
		return list
	}
	
	public static buildGroupItemForResponse(groupItem: GroupsModelType | null): GroupsModelResponse | null {
		if (!groupItem) {
			return null
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
		}
	}
	
	public async getGroup(filters?: MongoFilters<GroupsModelType<Schema.Types.ObjectId>>): Promise<HydratedDocument<GroupsModelType>> {
		const result: HydratedDocument<GroupsModelType<UserModel>> | null = await GroupModel.findOne({
			userId: this.user._id,
			...filters
		})
		
		
		if (!result) {
			throw new ResponseException(
				ResponseException.createObject(500, 'error', 'Не удалось найти группу событий')
			)
		}
		
		return result
	}
	
	public async resolveGroup(groupId?: Schema.Types.ObjectId): Promise<HydratedDocument<GroupsModelType>> {
		if (!groupId) {
			return await this.getGroup({
				type: "Main",
			})
		}
		
		try {
			return await this.getGroup({
				_id: groupId
			})
		} catch (e) {
			return await this.getGroup({
				type: "Main"
			})
		}
	}
	
	public async getSelectedGroups(): Promise<{ result: Array<HydratedDocument<GroupsModelType>> } & GroupHelper> {
		const result: Array<HydratedDocument<GroupsModelType>> | null = await GroupModel.find({
			userId: this.user._id,
			isSelected: true
		})
		
		if (!result) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Не удалось найти активные группы событий')
			)
		}
		
		return {
			...this,
			result
		}
	}
}