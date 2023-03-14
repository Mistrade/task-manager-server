import express from 'express';
import { ApiErrorHandler } from '../exceptions/api-error.handler';
import { SessionModel } from '../mongo/models/session.model';
import { UserModel, UserModelType } from '../mongo/models/user.model';
import JWT from 'jsonwebtoken';
import { Config } from '../config/config';
import { JWTAccessTokenPayload } from '../routes/public/session/session.router';
import { utcString } from '../common/common';
import { AuthRequest } from '../routes/public/plannings/types';

interface ErrorObject {
  message: string;
}

export interface RequestBody<T extends any = any> {
  user: UserModelType;
  data: T;
}

export async function AuthMiddleware(
  req: AuthRequest,
  res: express.Response<ErrorObject>,
  next: express.NextFunction
) {
  if (req.method !== 'OPTIONS') {
    const accessToken: string | undefined = req.cookies['accessToken'];

    if (!accessToken) {
      const err = ApiErrorHandler.UnauthorizedError();
      res.status(err.status);
      return res.send({
        message: err.message,
      });
    }

    const isVerifiedJWT = JWT.verify(accessToken, Config.secretAccessKey);

    if (!isVerifiedJWT) {
      return res.status(403).json({
        message: 'Невалидный токен доступа',
      });
    }

    const userInfoFromJWT = (await JWT.decode(
      accessToken
    )) as Partial<JWTAccessTokenPayload>;

    if (!userInfoFromJWT.phone || !userInfoFromJWT.id) {
      return res.status(403).json({
        message: 'Невалидный токен доступа',
      });
    }

    const session = await SessionModel.findOne({
      token: req.cookies['accessToken'],
    });

    if (!session) {
      //TODO тут нужно проверять refreshToken и если он валидный - создавать новую сессию
      return res.status(404).json({
        message: 'Активная сессия не найдена',
      });
    }

    const user: UserModelType | null = await UserModel.findOne({
      _id: userInfoFromJWT.id,
    });

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден',
      });
    }

    req.user = {
      _id: user._id,
      email: user.email,
      surname: user.surname,
      name: user.name,
      lastUpdate: utcString(user.lastUpdate),
      created: utcString(user.created),
      phone: user.phone,
    };
  }

  next('route');
}
