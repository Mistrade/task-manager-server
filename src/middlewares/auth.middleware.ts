import express from "express";
import {ApiErrorHandler} from "../exceptions/error-handler";
import {Session} from "../mongo/models/Session";
import {User, UserModel} from "../mongo/models/User";
import JWT from "jsonwebtoken";
import {Config} from "../config/config";
import {JWTAccessTokenPayload} from "../routes/SessionRouter/SessionRouter";
import {AuthRequest} from "../routes/EventsRouter/EventsRouter";

interface ErrorObject {
	message: string,
}

export interface RequestBody<T extends any = any> {
	user: UserModel,
	data: T
}

export async function AuthMiddleware(req: AuthRequest, res: express.Response<ErrorObject>, next: express.NextFunction) {
	if (req.method !== 'OPTIONS') {
		const accessToken: string | undefined = req.cookies['accessToken']
		
		if (!accessToken) {
			const err = ApiErrorHandler.UnauthorizedError()
			res.status(err.status)
			return res.send({
				message: err.message,
			})
		}
		
		const isVerifiedJWT = JWT.verify(accessToken, Config.secretAccessKey)
		
		if (!isVerifiedJWT) {
			return res.status(403).json({
				message: "Невалидный токен доступа"
			})
		}
		
		const userInfoFromJWT = await JWT.decode(accessToken) as Partial<JWTAccessTokenPayload>
		
		if (!userInfoFromJWT.phone || !userInfoFromJWT.id) {
			return res.status(403).json({
				message: 'Невалидный токен доступа'
			})
		}
		
		const session = await Session.findOne({
			token: req.cookies['accessToken'],
		})
		
		if (!session) {
			//TODO тут нужно проверять refreshToken и если он валидный - создавать новую сессию
			return res.status(404).json({
				message: 'Активная сессия не найдена'
			})
		}
		
		const user = await User.findOne({_id: userInfoFromJWT.id})
		
		if (!user) {
			return res.status(404).json({
				message: 'Пользователь не найден'
			})
		}
		
		req.user = user
		
	}
	
	next('route')
}