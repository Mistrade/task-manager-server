import {EventHandler_Create_Response, EventHandlerObject} from "./types";
import {CatchErrorHandler, ResponseException} from "../../../exceptions/ResponseException";
import {SessionHandler} from "../../SessionRouter/SessionHandler";
import {EventHelper} from "./helpers/eventHelper";


export const EventsHandler: EventHandlerObject = {
	async create(req, res) {
		
		try {
			//Получаю данные запроса
			const {user: userInfo, body} = req
			
			//Проверяю сессию пользователя
			const user = new SessionHandler(userInfo).checkUser()
			
			//Запускаю ивент хелпер
			const eventHelper = new EventHelper(user)
			
			//Вызываю автоматизированный метод создания события create
			const createdEvent = await eventHelper.create(body)
			
			//После генерирую успешный объект для отправки
			const r = new ResponseException(
				ResponseException.createSuccessObject<EventHandler_Create_Response>(
					{taskId: createdEvent._id}
				)
			)
			
			//Отвечаю успехом
			return res
				.status(r.status)
				.json(r.json)
		} catch (e) {
			//Если где-то в методах произойдет ошибка - этот catch их поймает.
			//Выведет в консоль и вернет ответ
			console.error(req.url, e)
			const error = CatchErrorHandler<null>(e)
			
			return res
				.status(error.status)
				.json(error.json)
		}
	},
	async remove(req, res) {
		try {
		
		} catch (e) {
			console.error('error in /events/remove', e)
			const result = CatchErrorHandler(e)
			return res.status(result.status).json(result.json)
		}
	}
}