import {UserModelResponse} from "../../../../common/transform/session/types";
import {EventModelType} from "../../../../mongo/models/EventModel";
import {objectIdIsEquals} from "../../../../common/common";
import {Schema} from "mongoose";
import {ResponseException} from "../../../../exceptions/ResponseException";

export class EventCheckRootsHelper {
	public user: UserModelResponse
	
	constructor(user: UserModelResponse) {
		this.user = user
	}
	
	//Метод, проверяющий наличие и корректность eventId, если он некорректный - будет выброшено исключение
	public static checkEventId(eventId?: Schema.Types.ObjectId): void {
		if (!eventId) {
			throw new ResponseException(
				ResponseException.createObject(400, 'error', 'Некорректное значение параметра eventId')
			)
		}
	}
	
	
	//Метод, проверяющий является ли пользователь, переданный при создании экземпляра - создателем события
	public isCreator(event: EventModelType): boolean {
		return objectIdIsEquals(event.userId._id, this.user._id)
	}
	
	//Метод, проверяющий является ли пользователь, переданный при создании экземпляра - участником события
	public isMember(e: EventModelType): boolean {
		
		if (e.invites && !e.invites.length) {
			return false
		}
		
		return !!e.invites.find(
			(item) => objectIdIsEquals(item.userId, this.user._id) && !!item.inviteId
		)
	}
	
	//Метод, проверяющий является ли пользователь, переданный при создании экземпляра - создателем или участником события
	public isCreatorOrMember(event: EventModelType): boolean {
		return this.isCreator(event) || this.isMember(event)
	}
	
}