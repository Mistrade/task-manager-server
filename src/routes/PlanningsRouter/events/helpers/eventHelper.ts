import {EventModel, EventModelInvitesObject, EventModelType} from "../../../../mongo/models/EventModel";
import {HydratedDocument, InferSchemaType, PopulateOptions, QueryOptions, Schema} from "mongoose";
import {SessionHandler} from "../../../SessionRouter/SessionHandler";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {UserModelResponse} from "../../../../common/transform/session/types";
import {objectIdIsEquals, utcDate} from "../../../../common/common";
import {EventHandler_Create_RequestData} from "../types";
import {GroupHelper} from "../../groups/helpers/groupHelper";
import {EventInfoHelper} from "../../info/helpers/eventInfo-helper";
import {HistoryHelper} from "../../history/helper/historyHelper";
import {EventHistoryCreateType} from "../../../../mongo/models/EventHistory";
import {RootsFilterType} from "./types";
import {User, UserModel} from "../../../../mongo/models/User";
import {EventInviteModel, EventInviteQueryType} from "../../../../mongo/models/EventInvite";
import {EventBuildHelper} from "./eventBuildHelper";
import {RequestEventFilters, ReturnEventTypeAfterBuild} from "../../info/types";
import {EventModelFilters} from "../../types";
import {Comment} from "../../../../mongo/models/Comment";
import {CommentsHelper} from "../../comments/helpers/comments.helper";


export class EventHelper extends EventBuildHelper {
	public user: UserModelResponse
	
	constructor(user?: UserModelResponse) {
		const userInfo = new SessionHandler(user).checkUser()
		super(userInfo)
		this.user = userInfo
	}
	
	//Метод, получающий событие из базы данных
	public async getEvent<EventType = EventModelType>(
		filters: EventModelFilters,
		populated?: Array<PopulateOptions>
	): Promise<HydratedDocument<EventType>> {
		console.log('filters: ', JSON.stringify(filters))
		const event: HydratedDocument<EventType> | null = await EventModel
			.findOne(filters)
			.populate(populated || []) as unknown as HydratedDocument<EventType>
		
		if (!event) {
			throw new ResponseException(ResponseException.createObject(404, "error", "Событие не найдено"))
		}
		
		return event
	}
	
	public async getEventList(
		filters: EventModelFilters,
		populate?: Array<PopulateOptions>
	): Promise<Array<HydratedDocument<EventModelType>>> {
		let result: Array<HydratedDocument<EventModelType>> | null = await EventModel
			.find(filters)
			.populate(populate || [])
		
		if (!result) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', "События по указанным фильтрам не найдены")
			)
		}
		
		return result
		
	}
	
	//Метод, получающий событие из базы данных, предварительно проверив права доступа на получение
	public async getEventWithCheckRoots<EventType = EventModelType>(
		filters: EventModelFilters,
		minimalRoots: RootsFilterType = 'any',
		populated?: Array<PopulateOptions>
	): Promise<HydratedDocument<EventType>> {
		return await this.getEvent({
			...filters,
			...this.buildMinimalRootsFilter(minimalRoots)
		}, populated)
	}
	
	//Метод, обновляющий событие и возвращающий обновленное событие
	//Не записывает данные в историю
	public async findAndUpdateEvent(
		filters: EventModelFilters,
		query: EventModelFilters,
		options?: QueryOptions<InferSchemaType<EventModelType>>
	): Promise<{ result: HydratedDocument<EventModelType> } & EventHelper> {
		const prevEvent: EventModelType | null = await EventModel.findOneAndUpdate(filters, query, options || {})
		
		if (!prevEvent) {
			throw new ResponseException(
				ResponseException.createObject(404, "error", "Не удалось обновить событие")
			)
		}
		
		return {result: await this.getEvent({_id: prevEvent._id}), ...this}
	}
	
	
	/** @name create.
	 * @async
	 * @public
	 * @param data {EventHandler_Create_RequestData} - набор входных данных для создания события.
	 * @description Логика метода:
	 * @description 1. Проверить входные данные
	 * @description 2. Если все данные ок - создать событие
	 * @description 3. Сформировать объекты для записи в историю
	 * @description 4. Если есть участники - отправить инвайты и так же сформировать объекты для записи в историю приглашенных юзеров
	 * @description 5. Отправить накопленные history в базу данных
	 * @description 6. Вернуть созданное событие
	 * @return {Promise}
	 */
	public async create(data: EventHandler_Create_RequestData): Promise<HydratedDocument<EventModelType>> {
		
		
		let {
			//Входные данные, которые прилетают на запрос
			title, timeEnd, time, status, link, linkedFrom, type, group, parentId, priority, description, members
		} = data
		
		//Создаю экземпляр помощника в работе с группами
		const groupHelper = new GroupHelper(this.user)
		//Вызываю метод resolveGroup, который найдет группу по groupId значению или вернет group.type = "Main" из БД, если по groupId найти не удалось
		const groupApi = await groupHelper.resolveGroup(group)
		
		//Проверяю стартовую дату, тк она обязательна
		const startTime = EventInfoHelper.checkDate(time)
		//Проверяю дату завершения, тк она тоже обязательна
		const endTime = EventInfoHelper.checkDate(timeEnd)
		
		//Создаю переменную, в которой буду хранить родительское событие из БД
		//По умолчанию - null, так как родительское событие не является обязательным для создания нового события
		let parentEvent: HydratedDocument<EventModelType> | null = null
		
		//Создаю переменную, в которой буду хранить событие, от которого клонировали создаваемое событие из БД
		//По умолчанию - null, так как событие может и не быть клонированным от другого
		let linkedFromEvent: HydratedDocument<EventModelType> | null = null
		
		//Создаю переменную, в которой буду хранить пользователей, приглашенных к создаваемому событию
		//По умолчанию - null, так как пользователи могут быть не найдены.
		//Используется для формирования EventInvite и записи в историю о приглашении новых пользователей
		let inviteUsers: Array<HydratedDocument<UserModel>> | null = null
		
		//Создаю массив, который в последующем будет записан в историю
		//По умолчанию - пустой массив
		const toHistoryArray: Array<EventHistoryCreateType> = []
		
		//Если есть участники события
		if (members?.length) {
			try {
				//Удаляю текущего юзера из списка участников, чтобы нельзя было добавить самого себя
				members = members.filter((user) => !objectIdIsEquals(user._id, this.user._id))
				
				//Если после этого все еще длина массив участников больше 0
				if (members?.length) {
					//Записываю в inviteUsers, найденных в базе пользователей
					inviteUsers = await User.find({_id: {$in: members}})
				} else {
					//Иначе, если пользователей в массив не осталось, записываю null
					inviteUsers = null
				}
			} catch (e) {
				//Если вдруг произошла ошибка при поиске в базе, то обрабатываю ее отправляя сообщение в вышестоящие catch
				throw new ResponseException(
					ResponseException.createObject(500, 'error', "Не удалось найти одного или нескольких пользователей, приглашенных к событию")
				)
			}
		}
		
		//Проверяю наличие Id родительского события во входных данных
		if (parentId) {
			//Если событие есть - запрашиваю его из Базы с соблюдением прав доступа
			try {
				//Создатель текущего события должен быть или участником или создателем родительского
				const result = await this.getEventWithCheckRoots({
					_id: parentId
				})
				
				//Если событие найдено, записываю его, по умолчанию - null
				parentEvent = result || null
			} catch (e) {
				
				//Если во время поиска родительского события произошла непредвиденная ошибка - обрываю запрос
				throw new ResponseException(
					ResponseException.createObject(500, 'error', "Не удалось найти родительское событие")
				)
			}
			
		}
		
		//Проверяю наличие Id события, от которого клонируем текущее
		if (linkedFrom) {
			//Если id события донора есть, то ищу его в базе с соблюдением прав доступа
			try {
				//Создатель текущего события должен быть или участником или создателем родительского
				const result = await this.getEventWithCheckRoots({
					_id: linkedFrom
				})
				
				//Если событие найдено, записываю его, по умолчанию - null
				linkedFromEvent = result || null
			} catch (e) {
				
				//Если во время поиска события донора произошла непредвиденная ошибка - обрываю запрос
				throw new ResponseException(
					ResponseException.createObject(500, 'error', "Не удалось найти событие, от которого производится клонирование")
				)
			}
		}
		
		//Теперь, когда все проверки для создания события пройдены - создаю событие в базе и получаю созданное из базы
		const createdEvent: HydratedDocument<EventModelType> | null = await EventModel
			.create({
				linkedFrom: linkedFromEvent?._id || null, //id события донора (от которого клонируем)
				parentId: parentEvent?._id || null, //id родительского события
				group: groupApi._id, //id группы событий
				title, //заголовок
				status, //статус
				priority, //приоритет
				time: utcDate(startTime), //дата начала в формате utc
				timeEnd: utcDate(endTime), //дата завершения в формате utc
				type, //тип события
				link, //ссылка
				invites: [], //Список приглашений по умолчанию пустой, с ним работа будет ниже
				userId: this.user._id, //создатель события
				description: description || '', //описание
				lastChange: utcDate(), //последнее изменение - только что, в формате utc
			})
		
		//Если мне не вернулся id создаваемого события, то
		if (!createdEvent._id) {
			//Обрываю запрос
			throw new ResponseException(
				ResponseException.createObject(500, 'error', 'Не удалось создать событие')
			)
		}
		
		//Создаю экземпляр помощника для работы с history API
		const history = new HistoryHelper(this.user)
		
		//Добавляю в заранее созданный массив объект истории с ключом createdAt (событие создано)
		toHistoryArray.push(history.buildHistoryItem('createdAt', createdEvent, {
			createdAt: utcDate()
		}))
		
		//Если было событие донор
		if (linkedFromEvent) {
			//Добавляю запись к только что созданному событию о том, что событие было клонировано
			toHistoryArray.push(
				history.buildHistoryItem('linkedFrom', createdEvent, {
					linkedFrom: history.getSnapshotRequiredFields(linkedFromEvent)
				})
			)
		}
		
		//Если было родительского событие
		if (parentEvent) {
			//Добавляю в массив истории 2 объекта
			toHistoryArray.push(
				//Первый объект - это запись в только что созданное событие о том, что событие привязано к родительскому
				history.buildHistoryItem('parentEvent', createdEvent, {
					parentEvent: history.getSnapshotRequiredFields(createdEvent)
				}),
				//Второй объект - это запись в родительское событие о том, что у него добавилось дочернее событие (только что созданное)
				history.buildHistoryItem('insertChildOfEvents', parentEvent, {
					insertChildOfEvents: [history.getSnapshotRequiredFields(createdEvent)]
				})
			)
		}
		
		//Если есть список приглашаемых пользователей и длина списка больше 0
		if (inviteUsers && inviteUsers?.length) {
			
			//Записываю инвайты в базу и получаем массив объектов с инвайтами
			const result: Array<HydratedDocument<EventInviteQueryType>> | null = await EventInviteModel.insertMany(
				//Здесь маппим массив, чтобы привести к формату записи в базу
				inviteUsers.map((u) => ({
					//id события
					event: createdEvent._id,
					//id юзера, который пригласил
					whoInvited: this.user._id,
					//id юзера, которого пригласили
					invitedUser: u._id,
					//по умолчанию статус - не принято (not_accepted)
					acceptedStatus: "not_accepted",
					//Ставим права доступа, которые к нам пришли для конкретного юзера, иначе по умолчанию - viewer (только просмотр)
					accessRights: members?.find((user) => objectIdIsEquals(user._id, u._id))?.accessRights || 'viewer'
				}))
			)
			
			//Если после записи инвайтов вернулся null или длина массива документов равна 0, то:
			if (!result || !result.length) {
				//Записываю накопленные history items
				await history.addToHistory(toHistoryArray)
				
				//Выкидываю исключение с ошибкой
				throw new ResponseException(
					ResponseException.createObject(500, 'error', 'Событие было создано, но отправить приглашения пользователям не удалось')
				)
			}
			
			//Иначе
			//Мапплю список, пришедший с базы к формату записи в событие
			const invitesUserId: Array<EventModelInvitesObject> = result.map(
				(item): EventModelInvitesObject => ({userId: item.invitedUser, inviteId: item._id})
			)
			
			//Обновляю событие
			await EventModel.updateOne({
				_id: createdEvent._id,
			}, {
				$push: {
					invites: invitesUserId
				}
			})
			
			//Добавляю запись в историю с типом sendInvites (отправленные приглашения)
			toHistoryArray.push(
				history.buildHistoryItem('sendInvites', createdEvent, {
					sendInvites: invitesUserId.map((item) => item.userId)
				})
			)
			
		}
		
		//Записываю сформированный массив в БД истории
		await history.addToHistory(toHistoryArray)
		
		//Если запись истории прошла успешно - возвращаю только что созданное событие из базы (получил его во время создания)
		return createdEvent
	}
	
	public async remove(filters?: EventModelFilters): Promise<void> {
		//Логика метода
		//- Ищу в базе события, которые потенциально могут быть удалены.
		//- Если события не найдены или произошла ошибка и вместо массива вернулось null - возвращаю количество удаленных событий 0.
		//- Формирую массив Id событий, в которых текущий пользователь - создатель.
		//- Проверяю, что массив с Id событиями не пустой.
		//- Удаляю события.
		//- Удаляю комментарии.
		//- Удаляю историю.
		
		
		const eventsForRemove: Array<HydratedDocument<EventModelType>> | null = await EventModel.find({
			...filters,
			userId: this.user._id
		})
		
		if (!eventsForRemove || eventsForRemove.length === 0) {
			throw new ResponseException(
				ResponseException.createObject(404, 'error', 'Не найдены события для удаления')
			)
		}
		
		const onlyCreatorEventsIdList = eventsForRemove
			.filter((event) => this.isCreator(event))
			.map((event) => event._id)
		
		if (onlyCreatorEventsIdList.length === 0) {
			throw new ResponseException(
				ResponseException.createObject(403, 'error', 'Вы не можете удалить эти события')
			)
		}
		
		const commentApi = new CommentsHelper(this.user)
		await commentApi.removeCommentsByEventId(onlyCreatorEventsIdList, true)
		
		const historyHelper = new HistoryHelper(this.user)
		await historyHelper.removeHistoryByEventId(onlyCreatorEventsIdList)
		
		await EventModel.deleteMany({
			_id: {$in: onlyCreatorEventsIdList},
			userId: this.user._id
		})
	}
	
	/** @name getShortEventsArray
	 * @async
	 * @param filters {RequestEventFilters} - набор входных параметров (фильтров) для поиска событий
	 * @summary Из полученных фильтров формирует запрос к базе, ищет список событий и разрешает конфликты групп в событиях, где пользователь приглашен
	 * @description Метод, возвращающий список коротких (по содержанию) версий событий
	 * @return {Array<ShortEventItemResponse>}
	 * @see ShortEventItemResponse
	 * @see buildQueryObjectFromFilters
	 * @see getEventList
	 * @see resolveEventsGroupAndBuild
	 * @throws {ResponseException} - Будет выброшено исключение в случаях если не удалось сформировать запрос к базе
	 * или в вызываемых методах сработает @throws (см. See also)
	 */
	public async getShortEventsArray(filters: RequestEventFilters): Promise<Array<ReturnEventTypeAfterBuild<'short'>>> {
		//Вызываю метод от наследованных классов, который сформирует запрос к базе из фильтров, полученных на входе
		const query = await this.buildQueryObjectFromFilters(filters)
		
		// console.log('запрос к базе по фильтрам: ')
		// console.log('Входные параметры: ', JSON.stringify(filters))
		// console.log('Параметры запроса: ', JSON.stringify(query, null, '\t'))
		
		//Если запрос сформировать не удалось
		if (!query) {
			//Отправляю исключение в обработчики catch
			throw new ResponseException(
				ResponseException.createObject(400, 'error', 'На вход ожидался объект с фильтрами')
			)
		}
		
		//Иначе
		//Запрашиваю
		const eventList: Array<HydratedDocument<EventModelType>> = await this.getEventList(query)
		
		return await this.resolveEventsGroupAndBuild(
			eventList,
			filters.findOnlyInSelectedGroups ? 'viewer' : 'owner',
			'Invite',
			'short'
		)
	}
}