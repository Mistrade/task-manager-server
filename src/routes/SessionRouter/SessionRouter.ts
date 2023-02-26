import express from "express";
import {RegistrationRequestBody} from "./types";
import {User, UserModel} from "../../mongo/models/User";
import bcrypt from 'bcryptjs'
import {validateTools} from "../../tools/validate";
import dayjs from "dayjs";
import JWT from 'jsonwebtoken'
import {Schema} from "mongoose";
import {Config} from "../../config/config";
import {Session} from "../../mongo/models/Session";
import {CustomResponseBody} from "../PlanningsRouter";
import {createBaseCalendars} from "../../common/common";

const route = express.Router()

const regExpPhone = new RegExp(/^7\d{10}$/, 'gi')

export interface JWTAccessTokenPayload {
	id: Schema.Types.ObjectId,
	phone: string
}

const generateAccessToken = (payload: JWTAccessTokenPayload) => {
	return JWT.sign(payload, Config.secretAccessKey, {expiresIn: '30d'})
}

const handlers = {
	//Регистрация нового пользователя
	async registration(req: express.Request<any, any, RegistrationRequestBody>, res: express.Response<CustomResponseBody<null>>) {
		try {
			if (req.cookies['accessToken']) {
				return res.status(403).json({
					data: null,
					info: {
						message: "У текушего пользователя уже есть сессия, регистрация невозможна.",
						type: "error"
					}
				})
			}
			
			const {phone, password, name, surname} = req.body as RegistrationRequestBody
			
			const isPhone = phone.match(regExpPhone)
			
			if (!isPhone) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Указан невалидный номер телефона, пример: 79129129191',
						type: 'error'
					}
				})
			}
			
			const isCorrectName = /^[А-Яа-яЁё]{2,}$/gi.test(name)
			
			if (!isCorrectName) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Некорректное имя пользователя',
						type: 'error'
					}
				})
			}
			
			const isCorrectSurname = /^[А-Яа-яЁё]{2,}$/gi.test(surname)
			
			if (!isCorrectSurname) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Некорректная фамилия пользователя',
						type: 'error',
					}
				})
			}
			
			const candidate = await User.findOne({phone})
			
			if (candidate) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Пользователь с указанным номером телефона уже зарегестрирован',
						type: 'error'
					}
				})
			}
			
			const passCheck = validateTools.checkPassword(password)
			
			if (!passCheck.status || !!passCheck.message) {
				return res.status(400).json({
					data: null,
					info: {
						message: passCheck.message || 'Указан некорректный пароль для регистрации нового пользователя',
						type: 'error'
					}
				})
			}
			
			const hashPassword = await bcrypt.hash(password, 8,)
			
			const user: UserModel = await User.create({
				phone,
				password: hashPassword,
				created: dayjs().utc().toDate(),
				name,
				surname,
				lastUpdate: dayjs().utc().toDate()
			})
			
			await createBaseCalendars(user)
			
			return res.status(200).json({
				data: null,
				info: {
					message: 'Пользователь успешно зарегистрирован',
					type: 'success',
				}
			})
			
		} catch (e: any) {
			console.error(e)
			return res.status(500).json({
				data: null,
				info: {
					message: e?.message || 'Во время обработки регистрации нового пользователя на сервере произошла ошибка',
					type: 'error'
				}
			})
		}
	},
	//Авторизация пользователя
	async auth(req: express.Request<any, any, RegistrationRequestBody>, res: express.Response<CustomResponseBody<null>>) {
		try {
			if (req.cookies['accessToken']) {
				res.cookie('accessToken', '', {maxAge: 0})
				const session = await Session.findOne({
					token: req.cookies['accessToken']
				})
				
				if (session) {
					await session.delete()
				}
			}
			
			const {phone, password} = req.body
			const user = await User.findOne({phone})
			
			if (!user) {
				return res.status(404).json({
					data: null,
					info: {
						message: 'Пользователь не найден',
						type: 'error'
					}
				})
			}
			
			const validPassword = await bcrypt.compare(password, user.password)
			
			if (!validPassword) {
				return res.status(400).json({
					data: null,
					info: {
						message: 'Пароли не совпадают',
						type: 'error'
					}
				})
			}
			
			const token = generateAccessToken({id: user._id, phone: user.phone})
			
			res.cookie('accessToken', token, {
				httpOnly: true,
				expires: dayjs().utc().add(30, 'day').toDate()
			})
			
			await Session.create({
				token,
				userId: user._id
			})
			
			return res.status(200).json({
				data: null,
				info: {
					message: "Пользователь успешно авторизован",
					type: 'success'
				}
			})
		} catch (e) {
			return res.status(500).json({
				data: null,
				info: {
					message: 'Произошла ошибка во время авторизации',
					type: "success"
				}
			})
		}
	},
	//Сброс пароля
	async reset(req: express.Request, res: express.Response) {
	
	},
	//Подтверждение учетной записи
	async confirm(req: express.Request, res: express.Response<CustomResponseBody<Omit<UserModel, 'password'>>>) {
		const accessToken = req.cookies['accessToken']
		if (!accessToken) {
			return res.status(401).json({
				data: null,
				info: {
					message: 'Пользователь не авторизован',
					type: 'error'
				}
			})
		}
		
		const isVerifiedJWT = JWT.verify(accessToken, Config.secretAccessKey)
		
		if (!isVerifiedJWT) {
			return res.status(401).json({
				data: null,
				info: {
					message: 'Невалидный токен доступа',
					type: 'error'
				}
			})
		}
		
		const userInfo = await JWT.decode(accessToken) as Partial<JWTAccessTokenPayload>
		
		if (!userInfo.id || !userInfo.phone) {
			return res.status(500).json({
				data: null,
				info: {
					message: 'Некорректная структура JWT токена',
					type: 'error'
				}
			})
		}
		
		const user = await User.findOne({
			_id: userInfo.id
		})
		
		if (!user) {
			return res
				.status(404)
				.json({
					data: null,
					info: {
						message: 'Пользователь не найден',
						type: 'error'
					}
				})
		}
		
		const session = await Session.findOne({
			token: accessToken,
			userId: userInfo.id,
		})
		
		if (!session) {
			return res.status(401).json({
				data: null,
				info: {
					message: 'Сессия не найдена',
					type: 'error'
				}
			})
		}
		
		return res.status(200).json({
			data: {
				name: user.name,
				_id: user._id,
				surname: user.surname,
				patronymic: user.patronymic,
				phone: user.phone,
				created: user.created,
			},
			info: {
				message: "Удачного планирования!",
				type: 'success'
			}
		})
	},
	async logout(req: express.Request, res: express.Response<CustomResponseBody<null>>) {
		try {
			
			if (!req.cookies['accessToken']) {
				return res
					.status(403)
					.json({
						data: null,
						info: {
							message: 'Пользователь не авторизован',
							type: 'warning'
						}
					})
			}
			
			const token = req.cookies['accessToken']
			
			await Session.deleteOne({
				token
			})
			
			
			res.cookie('accessToken', '', {maxAge: 0})
			
			return res
				.status(200)
				.json({
					data: null,
					info: {
						message: 'Будем рады видеть вас снова!',
						type: 'success'
					}
				})
		} catch (e) {
			return res.status(500).json({
				data: null,
				info: {
					message: 'Произошла непредвиденная ошибка сервера',
					type: 'error'
				}
			})
		}
		
	}
}

route.post('/reg', handlers.registration)
route.post('/auth', handlers.auth)
route.post('/reset', handlers.reset)
route.post('/confirm', handlers.confirm)
route.post('/logout', handlers.logout)

export const SessionRouter = route