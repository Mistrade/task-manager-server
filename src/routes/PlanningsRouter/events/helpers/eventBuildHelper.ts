import {EventCheckingHelper} from "./eventCheckingHelper";
import {UserModelResponse} from "../../../../common/transform/session/types";
import {
	DateInputValue,
	DateQueryObject,
	DefaultEventItemResponse,
	EventBuildTypes,
	RequestEventFilters,
	ReturnEventTypeAfterBuild
} from "../../info/types";
import dayjs, {Dayjs} from "dayjs";
import {objectIdInArrayOfAnotherObjectId, objectIdIsEquals, utcDate, utcString} from "../../../../common/common";
import {AnyObject} from "../../history/helper/historyHelper";
import {HydratedDocument, Schema} from "mongoose";
import {GroupModel, GroupsModelType, GroupUniqueTypes} from "../../../../mongo/models/Group";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {DbTaskPriorities, minimalRootsMap, TaskStatusesObject} from "../../../../common/constants";
import {EventModelType} from "../../../../mongo/models/EventModel";
import {GroupHelper} from "../../groups/helpers/groupHelper";
import {UserModelHelper} from "../../../../mongo/helpers/User";
import {RootsFilterType} from "./types";

/** @class EventBuildHelper
 * @author Андрей Черников
 * @description Класс, с набором методов по сборке событий для отправки в ответ на запрос
 * @description Или разрешения конфликтов групп событий в событиях, где текущий юзер - участник
 * @extends EventCheckingHelper - класс с набором методов для проверки прав доступа, значений в событиях
 * @since 25.02.2023
 */
export class EventBuildHelper extends EventCheckingHelper {
	/** @name user
	 * @description Текущий пользователь, от которого пришел запрос
	 * @type {UserModelResponse}
	 */
	public user: UserModelResponse
	
	constructor(user: UserModelResponse) {
		super(user)
		this.user = user
	}
	
	/**@name buildDateQuery
	 * @description Метод, формирующий параметры запроса к базе по дате начала и/или дате завершения
	 * @param fromDate {DateInputValue} - дата начала события
	 * @param toDate {DateInputValue} - дата завершения события
	 * @return DateQueryObject
	 * @since 25.02.2023
	 */
	public buildDateQuery(fromDate: DateInputValue, toDate: DateInputValue): DateQueryObject {
		//Создаю экземпляр dayjs по дате начала или null
		let startDate: Dayjs | null = fromDate ? dayjs(fromDate) : null
		//Аналогично по дате завершения
		let endDate: Dayjs | null = toDate ? dayjs(toDate) : null
		
		//Проверяю валидность обеих дат
		startDate = !startDate?.isValid() ? null : startDate
		endDate = !endDate?.isValid() ? null : endDate
		
		//Если валидны и дата начала, и дата завершения
		if (startDate && endDate) {
			//Формирую несколько кейсов поиска, учитывая сквозные и внутридневные события
			return {
				$or: [
					{
						//Кейс когда событие начинается и завершается между startDate и endDate
						time: {
							$gte: utcDate(startDate),
							$lte: utcDate(endDate)
						},
						timeEnd: {
							$gte: utcDate(startDate),
							$lte: utcDate(endDate)
						}
					},
					{
						//Кейс когда событие начинается раньше startDate и заканчивается позже endDate
						time: {
							$lte: utcDate(startDate)
						},
						timeEnd: {
							$gte: utcDate(endDate)
						}
					},
					{
						//Кейс когда событие начинается раньше startDate, а заканчивается между startDate и andDate
						time: {
							$lte: utcDate(startDate)
						},
						timeEnd: {
							$gte: utcDate(startDate),
							$lte: utcDate(endDate)
						}
					},
					{
						//Кейс когда событие начинается между startDate и endDate, а заканчивается позже endDate
						time: {
							$gte: utcDate(startDate),
							$lte: utcDate(endDate)
						},
						timeEnd: {
							$gte: utcDate(endDate)
						}
					}
				],
			}
		}
		
		//Если нет даты начала и есть дата завершения
		if (!startDate && endDate) {
			return {
				//Ищу события, которые заканчиваются до или точно в дату завершения из фильтров
				timeEnd: {
					$lte: utcDate(endDate)
				}
			}
		}
		
		//Если есть дата начала и нет даты завершения
		if (startDate && !endDate) {
			return {
				//Ищу события, которые заканчиваются после или точно в дату начала из фильтров
				timeEnd: {
					$gte: utcDate(startDate)
				}
			}
		}
		
		//Иначе - параметры запроса формировать не нужно
		return {}
		
	}
	
	/**@name buildQueryObjectFromFilters
	 * @description Метод формирующий запрос к базе на поиск событий, из полученных фильтров
	 * @param filters {RequestEventFilters} - набор фильтров для формирования запроса на поиск событий в базе
	 * @return {Promise<AnyObject | null>}
	 * @since 25.02.2023
	 */
	public async buildQueryObjectFromFilters(filters?: RequestEventFilters): Promise<AnyObject | null> {
		//Если фильтров нет - возвращаем пустой объект
		if (!filters) {
			return null
		}
		
		//Достаем данные из фильтров
		const {
			fromDate, //С какой даты искать
			toDate, //По какую дату искать
			title, //Фильтр по заголовку
			priority, //Фильтр по приоритету события
			taskStatus, //Фильтр по статусу события
			onlyFavorites, //Фильтр по наличию в избранных событиях
			exclude, //Доп.фильтры, имеющие параметры исключения событий из выборки
			utcOffset, //Смещение от utc в минутах
			findOnlyInSelectedGroups //Если true - поиск идет по выбранным группам событий, иначе верну только созданные юзером (без приглашений)
		} = filters
		
		//Создаю пустой объект, куда буду складывать параметры запроса
		const result: AnyObject = {}
		
		//Формирую параметры по датам
		const dateFilters = this.buildDateQuery(fromDate, toDate)
		
		//Функция, которая добавить в ключ $and данные, необходимые сочетать с условиями $or
		const pushToResult$And = (data: AnyObject) => {
			result['$and'] = result['$and']
				? [...result['$and'], data]
				: [data]
		}
		
		//если есть ключ $or, пушу в result.$and
		if (dateFilters['$or']) {
			pushToResult$And({$or: dateFilters['$or']})
		}
		
		//Если есть просто time, то кладу на верхнем уровне
		if (dateFilters['time']) {
			result['time'] = dateFilters['timeEnd']
		}
		
		//Если есть просто timeEnd, то кладу на верхнем уровне
		if (dateFilters['timeEnd']) {
			result['timeEnd'] = dateFilters['timeEnd']
		}
		
		//Если пришел ключ findOnlyInSelectedGroups - включаю логику поиска только по выбранным группа.
		//Включает в себя приглашения, если эта группа выбрана у пользователя
		if (findOnlyInSelectedGroups) {
			//Ищу выбранные группы в базе
			const selectedGroups: Array<HydratedDocument<GroupsModelType>> | null = await GroupModel.find({
				userId: this.user._id,
				isSelected: true
			})
			
			//Если их нет, то исключение
			if (!selectedGroups) {
				throw new ResponseException(
					ResponseException.createObject(404, 'error', 'Не удалось найти выбранные группы событий')
				)
			}
			
			//Создаю фильтр $or
			const groupFilters: Array<AnyObject> = []
			
			//Если приглашения выбраны добавляю в $or условие, что в инвайтах юзер должен быть
			if (!!selectedGroups.find((group) => group.type === 'Invite')) {
				//Ищем в приглашениях
				groupFilters.push({
					"invites.userId": this.user._id,
				})
			}
			
			//Добавляю фильтр по событиям которые создал юзер и сужаю поиск по выбранным группам
			groupFilters.push({
				userId: this.user._id,
				group: {
					$in: selectedGroups.map((group) => group._id)
				}
			})
			
			//Пушу в result.$and
			pushToResult$And({
				$or: groupFilters
			})
		} else {
			//Иначе
			//Ищу все события созданные юзером, без приглашений
			result['userId'] = this.user._id
		}
		
		//Если пришло значение taskStatus (статус события)
		if (taskStatus) {
			//Проверяю значение taskStatus из заранее определенных значений
			const statuses = TaskStatusesObject[taskStatus]
			
			//Если проверка не удалась - выбрасываю исключение
			if (!statuses) {
				throw new ResponseException(
					ResponseException.createObject(404, 'error', 'Некорректное значение поля: "Статус события"')
				)
			}
			
			//Иначе - записываю в объект запроса
			result.status = {$in: statuses}
		}
		
		//Если пришло значение title (заголовок)
		if (title) {
			//Записываю в объект запроса
			result.title = {
				$regex: `${title}`,
				$options: 'i'
			}
		}
		
		//Если пришел priority (приоритет события) и он не равен not_selected
		if (priority && priority !== 'not_selected') {
			//Проверяю полученное значение
			const searchResult = DbTaskPriorities.includes(priority)
			
			//Если проверка провалилась - выбрасываю исключение
			if (!searchResult) {
				throw new ResponseException(
					ResponseException.createObject(404, 'error', 'Некорректное значение поля: "Приоритет события"')
				)
			}
			
			//Иначе - записываю в объект запроса
			result.priority = {
				$eq: priority
			}
		}
		
		//Если есть объект с исключениями
		if (exclude) {
			//Проверяю и записываю в объект запроса id событий, который надо исключить
			if (exclude.eventIds && exclude.eventIds.length) {
				result._id = {
					$nin: exclude.eventIds,
				}
			}
			
			//Если есть parentId - ищу события, у которых нет parentId с указанным значением
			if (exclude.parentId) {
				result.parentId = {
					$ne: exclude.parentId
				}
			}
			
			//Если есть linkedFrom - ищу события, у которых нет linkedFrom с указанным значением
			if (exclude.linkedFrom) {
				result.linkedFrom = {
					$ne: exclude.linkedFrom
				}
			}
		}
		
		//Если пришло значение onlyFavorites = true
		if (onlyFavorites) {
			//Ищу события, которые добавлены в избранное у текущего юзера (сужаю поиск)
			result.likedUsers = {
				$in: this.user._id
			}
		}
		
		//Все выше описанные фильтры сужают поиск событий
		//За исключением $or фильтров
		
		return result
	}
	
	/**@name buildShortEventResponseObject
	 * @description Метод формирующий из события, хранящегося в базе, короткую версию события, отправляемого в ответ на запросы
	 * @param event - событие из базы, которое будет трансформироваться в короткую версию события
	 * @return {ShortEventItemResponse}
	 * @since 25.02.2023
	 */
	public buildShortEventResponseObject(event: EventModelType): ReturnEventTypeAfterBuild<'short'> {
		return {
			_id: event._id, //id события
			title: event.title, //Заголовок
			time: utcString(event.time), //Начало события
			timeEnd: utcString(event.timeEnd), //Конец события
			priority: event.priority, //Приоритет события
			status: event.status, //Статус события
			isLiked: objectIdInArrayOfAnotherObjectId(this.user._id, event.likedUsers), //Находится ли событие в списке избранных
			link: event.link, //Ссылка для подключения
			group: GroupHelper.buildGroupItemForResponse(event.group), //Группа событий
			description: event.description, //Описание события,
			userId: UserModelHelper.getPopulatedUserWithoutPassword(event.userId)
		}
	}
	
	/**@name buildDefaultEventResponseObject
	 * @description Метод формирующий из события, хранящегося в базе, полную версию события, отправляемого в ответ на запросы
	 * @param event - событие из базы, которое будет трансформироваться в полную версию события
	 * @return {DefaultEventItemResponse}
	 * @since 25.02.2023
	 */
	public buildDefaultEventResponseObject(event: EventModelType): ReturnEventTypeAfterBuild<'default'> {
		//Проверяю есть ли в инвайтах юзер
		const invite = event.invites.find((value) => value?.userId ? objectIdIsEquals(value.userId, this.user._id) : false)
		//Проверяю, является ли текущий юзер, создателем события
		const isCreator = objectIdIsEquals(this.user._id, event.userId._id)
		
		return {
			_id: event._id, //id события
			title: event.title, //заголовок
			time: utcString(event.time), //начало события
			timeEnd: utcString(event.timeEnd), //конец события
			createdAt: utcString(event.createdAt), //когда было создано событие
			parentId: event.parentId, //родительское событие
			linkedFrom: event.linkedFrom, //событие, от которого был создан клон
			type: event.type, //тип события
			description: event.description, //описание события
			updatedAt: utcString(event.updatedAt), //дата последнего обновления события в базе
			userId: UserModelHelper.getPopulatedUserWithoutPassword(event.userId), //пользователь, создавший событие
			group: GroupHelper.buildGroupItemForResponse(event.group), //группа событий, за которой закреплено событие
			link: event.link, //Ссылка для подключения
			isLiked: objectIdInArrayOfAnotherObjectId(this.user._id, event.likedUsers), //Находится ли событие в списке избранных
			priority: event.priority, //Приоритет события
			status: event.status, //Статус события
			invites: event.invites //Список приглашений
				.map((i) => i.inviteId?._id || null)
				.filter((i): i is Schema.Types.ObjectId => i !== null),
			acceptedStatus: isCreator ? undefined : (invite?.inviteId?.acceptedStatus || "not_accepted"), //Статус принятия события приглашенным пользователем
			accessRights: isCreator ? 'owner' : invite?.inviteId?.accessRights //Права доступа текущего юзера к событию
		}
	}
	
	/**@name buildEvent
	 * @description Метод, определяющий какой тип сборки события использовать для ответа на запрос
	 * @param event - событие для сборки
	 * @param buildType - тип сборки (коротка или полная)
	 * @return {DefaultEventItemResponse}
	 * @return {ShortEventItemResponse}
	 * @since 25.02.2023
	 */
	public buildEvent<BuildType extends EventBuildTypes>(event: EventModelType, buildType: BuildType): ReturnEventTypeAfterBuild<BuildType> {
		switch (buildType) {
			case "default":
				//Если buildType === default, то соберется полная версия события
				return this.buildDefaultEventResponseObject(event) as ReturnEventTypeAfterBuild<BuildType>
			case "short":
				//Если buildType === short, то соберется короткая версия события
				return this.buildShortEventResponseObject(event) as ReturnEventTypeAfterBuild<BuildType>
			default:
				//По умолчанию сборка полной версии
				return this.buildDefaultEventResponseObject(event) as ReturnEventTypeAfterBuild<BuildType>
		}
	}
	
	/**@name buildMinimalRootsFilter
	 * @description Метод, формирующий параметры запроса к базе, на основе прав доступа
	 * @param minimalRoots - минимальные права доступа
	 * @return {AnyObject}
	 * @since 25.02.2023
	 */
	public buildMinimalRootsFilter(minimalRoots: RootsFilterType): AnyObject {
		
		const creator = {
			userId: this.user._id
		}
		
		switch (minimalRoots) {
			case "owner":
				return creator
			case "viewer":
				//Если минимальные права - только просмотр, то:
				return {
					//Ищу от создателя до приглашенных пользователей, у которых права - только просмотр
					$or: [
						creator,
						{
							"invites.userId": this.user._id,
							// "invites.inviteId.accessRights": {$in: minimalRootsMap.viewer}
						}
					]
				}
			case "editor":
				//Если минимальные права - редактор
				return {
					//Ищу права создателя, редактора, админа
					$or: [
						creator,
						{
							"invites.userId": this.user._id,
							// "invites.inviteId.accessRights": {
							// 	$in: minimalRootsMap.editor
							// }
						}
					]
				}
			case "admin":
				//Если минимальные права - админ
				return {
					//В выборку попадут только создатель и админ
					$or: [
						creator,
						{
							"invites.userId": this.user._id,
							// "invites.inviteId.accessRights": {
							// 	$in: minimalRootsMap.admin
							// }
						}
					]
				}
			case "any":
				//Если минимальные права - любые
				return {
					//Ищу создателя или наличие в инвайтах
					$or: [
						{userId: this.user._id},
						{"invites.userId": this.user._id}
					]
				}
			default:
				//По умолчанию - параметры запроса не формирую
				return {}
		}
	}
	
	/**@name setInviteGroupAndBuild
	 * @description Метод, заменяющий в событиях, в которых пользователь приглашен группу событий на полученную группу событий
	 * @description Нужно для того, чтобы заменить в событиях группу создателя на группу "Приглашения", если пользователь приглашен в событие
	 * @description После замены - делает сборку события полную или короткую
	 * @param event - событие, в котором будут проводиться изменения
	 * @param group - объект группы событий, на которую будут проводиться изменения
	 * @param buildType - тип сборки события (коротка или полная)
	 * @returns {DefaultEventItemResponse, ShortEventItemResponse}
	 * @since 25.02.2023
	 */
	public setInviteGroupAndBuild<BuildType extends EventBuildTypes = 'default'>(
		event: EventModelType,
		group: GroupsModelType,
		buildType: BuildType,
	): ReturnEventTypeAfterBuild<BuildType> | null {
		//Если юзер - создатель, провожу сборку
		if (this.isCreator(event)) {
			return this.buildEvent<BuildType>(event, buildType)
		}
		
		//Ищу приглашение, если оно есть
		const invite = event.invites.find(
			(value) => objectIdIsEquals(value.userId, this.user._id)
		)
		
		//Если приглашения нет - возвращаю null
		if (!invite) {
			return null
		}
		
		//Если есть приглашение, то заменяю группу на группу, полученную в аргументах
		const result = event
		result.group = group
		
		//Провожу сборку события
		return this.buildEvent<BuildType>(result, buildType)
	}
	
	/**@name resolveEventsGroupAndBuild
	 * @description Метод, разрешающий конфликт групп событий, преимущественно в событиях, в которые пользователь приглашен
	 * @description Под капотом вызывает метод this.setInviteGroupAndBuild
	 * @description Проверяет минимальные права доступа и фильтрует события по ним
	 * @description В конце - запускает процесс сборки массива событий в короткий или полный формат
	 * @param arr - массив событий, в котором будут проводиться работы
	 * @param minimalRoots - минимальные права доступа для фильтрации событий
	 * @param replaceInvitesToGroupType - на какой тип группы событий производить замену, в событиях, где юзер - участник
	 * @param buildType - тип сборки события (полная или короткая)
	 * @see setInviteGroupAndBuild
	 * @see EventModelType
	 * @see RootsFilterType
	 * @see GroupUniqueTypes
	 * @see EventBuildTypes
	 * @see ReturnEventTypeAfterBuild
	 * @see EventCheckingHelper
	 * @see buildEvent
	 * @throws {ResponseException} - Исключение будет выброшено, если группа событий не найдена или если будет выброшено в использующихся методах
	 * @returns {Array<ReturnEventTypeAfterBuild>}
	 * @since 25.02.2023
	 */
	public async resolveEventsGroupAndBuild<BuildType extends EventBuildTypes = 'default'>(
		arr: Array<EventModelType>,
		minimalRoots: RootsFilterType,
		replaceInvitesToGroupType: GroupUniqueTypes = "Invite",
		buildType: BuildType
	): Promise<Array<ReturnEventTypeAfterBuild<BuildType>>> {
		
		//Если пришел пустой массив, возвращаю так же пустой массив и не выполняю проверок
		if (!arr.length) {
			return []
		}
		
		//Если минимальные права - создатель
		if (minimalRoots === 'owner') {
			return arr
				//Фильтрую массив полученных событий, оставляю только те, где пользователь - создатель
				.filter((event) => this.isCreator(event))
				//Провожу сборку массива событий
				.map((ev) => this.buildEvent(ev, buildType))
		}
		
		//Создаю массив результирующих событий, над которыми будет производиться разрешение конфликтов по группам событий.
		//Так как ниже будет обработка событий, в которых пользователь приглашен
		let resultArray: Array<EventModelType> = arr
		
		//Если минимальные права - только просмотр, фильтрую события от создателя до только просмотр
		if (minimalRoots === 'viewer') {
			resultArray = resultArray.filter((event) => this.isCreatorOrViewer(event))
		}
		
		//Если минимальные права - редактор, фильтрую события от создателя до редактора
		if (minimalRoots === 'editor') {
			resultArray = resultArray.filter((e) => this.isCreatorOrEditor(e))
		}
		
		//Если минимальные права - админ, фильтрую события от создателя до админа
		if (minimalRoots === 'admin') {
			resultArray = resultArray.filter((e) => this.isCreatorOrAdmin(e))
		}
		
		//Если минимальные права - любые, фильтрую события, где юзер или создатель, или участник, с любыми правами доступа
		if (minimalRoots === 'any') {
			resultArray = resultArray.filter((event) => this.isCreatorOrMember(event))
		}
		
		//Если после фильтров не осталось событий - возвращаю пустой массив
		if (!resultArray.length) {
			return []
		}
		
		//Ищу группу событий по "тип группы событий", обычно используется Invite (приглашения)
		const group: HydratedDocument<GroupsModelType> | null = await GroupModel.findOne({
			userId: this.user._id,
			type: replaceInvitesToGroupType
		})
		
		//Если группа не найдена - выбрасываю исключение
		if (!group) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', `Не удалось найти группу событий с типом ${replaceInvitesToGroupType} у текущего пользователя`)
			)
		}
		
		//В массиве событий, которые остались после фильтров, заменяю группу событий там, где пользователь - участник
		const res: Array<ReturnEventTypeAfterBuild<BuildType> | null> = resultArray.map(
			(event): ReturnEventTypeAfterBuild<BuildType> | null => this.setInviteGroupAndBuild<BuildType>(event, group, buildType)
		)
		
		//По итогу фильтрую массив, на предмет удаления любых false значений
		return res.filter<DefaultEventItemResponse>((value): value is DefaultEventItemResponse => !!value)
	}
}