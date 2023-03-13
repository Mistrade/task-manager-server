import {UserModelResponse} from "../../../../common/transform/session/types";
import {EventModelType} from "../../../../mongo/models/EventModel";
import {objectIdIsEquals} from "../../../../common/common";
import {Schema} from "mongoose";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {EventsStorageHelper} from "./eventsStorageHelper";
import {EventHelper} from "./eventHelper";
import {DefaultEventItemResponse} from "../../info/types";
import {AccessRightsWithOwner, EventInviteAccessRights} from "../../../../mongo/models/EventInvite";
import {minimalRootsMap} from "../../../../common/constants";

export type CheckUserRootsReturnedTypes = 'response-item' | 'model-item' | 'none'

export interface CheckUserRootsReturned {
	"response-item": DefaultEventItemResponse,
	"model-item": EventModelType,
	"none": null
}

/** @class EventCheckingHelper
 * @author Андрей Черников
 * @description Класс, с набором методов для проверки прав доступа к событиям
 * @extends EventsStorageHelper
 */
export class EventCheckingHelper extends EventsStorageHelper {
	public user: UserModelResponse
	
	/**
	 * @constructor
	 * @param user - Текущий юзер, от которого получен запрос
	 */
	constructor(user: UserModelResponse) {
		super()
		this.user = user
	}
	
	/** @name checkEventId
	 * @description Метод, проверяющий наличие и корректность eventId, если он некорректный - будет выброшено исключение
	 * @param eventId - необязательный параметр, проверяется только наличие значение в этом агрументе
	 * @return {void}
	 */
	public static checkEventId(eventId?: Schema.Types.ObjectId): void {
		if (!eventId) {
			throw new ResponseException(
				ResponseException.createObject(400, 'error', 'Некорректное значение параметра eventId')
			)
		}
	}
	
	/** @name checkUserRootsAndBuild
	 * @this {user} - текущий пользователь
	 * @access public
	 * @summary Метод, проверяющий в объекте события права доступа текущего пользователя и возвращающий сборку события или исключение
	 * @see CheckUserRootsReturned
	 * @see CheckUserRootsReturnedTypes
	 * @see EventInviteAccessRights
	 * @see EventModelType
	 * @see DefaultEventItemResponse
	 * @see UserModelResponse
	 * @param event {EventModelType} - Событие, в котором будет производиться проверка прав доступа текущего пользователя
	 * @param minimalRoots {EventInviteAccessRights} - Минимальные права доступа к событию, если в результате проверки
	 * прав доступа недостаточно для минимальных - будет выброшено исключение
	 * @param returnType {CheckUserRootsReturnedTypes} - Возвращает либо сборку полной версии события, либо документ из базы, либо null
	 * @param message {string} - сообщение, которое будет добавлено в исключение, когда прав доступа будет недостаточно
	 * @return {Promise<CheckUserRootsReturned[CheckUserRootsReturnedTypes]>}
	 * @since 25.02.2023
	 * @throws {ResponseException} - Исключение будет выброшено, если полученное событие можно приравнять к false
	 * или если недостаточно прав доступа для минимальных в параметре minimalRoots
	 */
	public checkUserRootsAndBuild<T extends CheckUserRootsReturnedTypes>(
		event: EventModelType | null,
		minimalRoots: AccessRightsWithOwner,
		returnType: T,
		message?: string,
	): CheckUserRootsReturned[T] {
		//Если событие не получено - кидаю исключение
		if (!event) {
			throw new ResponseException(
				ResponseException.createObject(500, 'error', 'Не удалось проверить права доступа к событию')
			)
		}
		
		//Создаю экземпляр EventHelper, в нем есть нужные методы для проверки
		const eventApi = new EventHelper(this.user)
		//Провожу сборку полного объекта события
		const buildEvent = eventApi.buildDefaultEventResponseObject(event)
		
		//Если в сборке нет прав доступа или права доступа не подходят под минимальные - выбрасываю исключение
		if (!buildEvent.accessRights || !minimalRootsMap[minimalRoots].includes(buildEvent.accessRights)) {
			throw new ResponseException(
				ResponseException.createObject(403, 'error', message || 'У вас недостаточно прав доступа')
			)
		}
		
		//Этот код сработает, если права доступа устраивают минимальный порог
		//Если возвращаемый тип response-item, возвращаю полную сборку события для ответа
		if (returnType === 'response-item') {
			return buildEvent as unknown as CheckUserRootsReturned[T]
		}
		
		//Если возвращаем тип model-item, то возвращаю объект из базы
		if (returnType === 'model-item') {
			return event as unknown as CheckUserRootsReturned[T]
		}
		
		//Иначе null
		return null as unknown as CheckUserRootsReturned[T]
	}
	
	/**@name isCreator
	 * @this {user} - текущий пользователь
	 * @access public
	 * @summary Метод, проверяющий является ли пользователь, переданный при создании экземпляра - создателем события
	 * @description Под капотом сравнивает два ObjectId в формате строки (текущий юзер и создатель полученного события)
	 * @param event - событие, в котором будет проводиться проверка
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isCreator(event: EventModelType): boolean {
		return objectIdIsEquals(event.userId._id, this.user._id)
	}
	
	/**@name isMember
	 * @this {user} - текущий пользователь
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @summary Проверяет только наличие приглашения, не проверяет права доступа
	 * @description Метод, проверяющий является ли пользователь, переданный при создании экземпляра - участником полученного события
	 * @param e {EventModelType} - событие, в котором будет производиться проверка
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isMember(e: EventModelType): boolean {
		
		if (e.invites && !e.invites.length) {
			return false
		}
		
		return !!e.invites.find(
			(item) => objectIdIsEquals(item.userId, this.user._id) && !!item.inviteId
		)
	}
	
	/**@name isAdmin
	 * @this {user} - текущий пользователь
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @summary Проверяет является ли пользователь админом события или создателем
	 * @description Метод, проверяющий является ли пользователь, переданный при создании экземпляра - администратором или создателем текущего события
	 * @param e {EventModelType} - событие, в котором будет производиться проверка
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isAdmin(e: EventModelType): boolean {
		if (e.invites && !e.invites.length) {
			return false
		}
		
		return !!e.invites.find(
			(item) => objectIdIsEquals(item.userId, this.user._id)
				&& item.inviteId?.accessRights
				&& minimalRootsMap.admin.includes(item.inviteId?.accessRights)
		)
	}
	
	/**@name isViewer
	 * @this {user} - текущий пользователь
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @summary Проверяет, хватает ли у пользователя прав доступа для просмотра события
	 * @description Метод, проверяющий может ли пользователь просматривать событие
	 * @param e {EventModelType} - событие, в котором будет производиться проверка
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isViewer(e: EventModelType): boolean {
		if (e.invites && !e.invites.length) {
			return false
		}
		
		return !!e.invites.find(
			(item) => objectIdIsEquals(item.userId, this.user._id)
				&& item.inviteId?.accessRights
				&& minimalRootsMap.viewer.includes(item.inviteId?.accessRights)
		)
	}
	
	/**@name isEditor
	 * @this {user} - текущий пользователь
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @memberOf isCreatorOrEditor
	 * @summary Проверяет, хватает ли у пользователя прав доступа для редактирования события
	 * @description Метод, проверяющий может ли пользователь редактировать событие
	 * @param e {EventModelType} - событие, в котором будет производиться проверка
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isEditor(e: EventModelType): boolean {
		if (e.invites && !e.invites.length) {
			return false
		}
		
		return !!e.invites.find(
			(item) => objectIdIsEquals(item.userId, this.user._id)
				&& item.inviteId?.accessRights
				&& minimalRootsMap.editor.includes(item.inviteId?.accessRights)
		)
	}
	
	/**@name isCreatorOrMember
	 * @this {user} - текущий пользователь
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @summary Не проверяет права доступа приглашенных пользователей, только наличие приглашения
	 * @description Метод, проверяющий является ли пользователь создателем или участником
	 * @param event {EventModelType} - событие, в котором будет производиться проверка
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isCreatorOrMember(event: EventModelType): boolean {
		return this.isCreator(event) || this.isMember(event)
	}
	
	/**
	 * @name isCreatorOrViewer
	 * @this {user} - текущий пользователь
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @summary Проверяет, хватает ли у пользователя прав доступа для просмотра события или пользователь является создателем
	 * @description Метод, проверяющий является ли пользователь создателем или имеет права для просмотра события
	 * @param e {EventModelType} - событие, в котором будет производиться проверка
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isCreatorOrViewer(e: EventModelType): boolean {
		return this.isCreator(e) || this.isViewer(e)
	}
	
	/**
	 * @name isCreatorOrEditor
	 * @this {user} - текущий пользователь
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @summary Проверяет, хватает ли у пользователя прав доступа для редактирования события или пользователь является создателем
	 * @description Метод, проверяющий является ли пользователь создателем или имеет права для редактирования события
	 * @param e {EventModelType} - событие, в котором будет производиться проверка
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isCreatorOrEditor(e: EventModelType): boolean {
		return this.isCreator(e) || this.isEditor(e)
	}
	
	/**
	 * @name isCreatorOrAdmin
	 * @this {user} - текущий пользователь
	 * @see UserModelResponse
	 * @see EventModelType
	 * @see objectIdIsEquals
	 * @summary Проверяет, является ли пользователь администратором или создателем события
	 * @description Метод, проверяющий является ли пользователь создателем или имеет права администратора
	 * @param e {EventModelType} - событие, в котором будет производиться проверка
	 * @return boolean
	 * @since 25.02.2023
	 */
	public isCreatorOrAdmin(e: EventModelType): boolean {
		return this.isCreator(e) || this.isAdmin(e)
	}
	
}