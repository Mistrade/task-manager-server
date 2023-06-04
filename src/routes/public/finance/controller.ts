import { HydratedDocument, Types } from 'mongoose';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../exceptions/response.exception';
import {
  Finance,
  FINANCE_MODEL_PATHS,
  IFinance,
} from '../../../mongo/models/finance/finance.model';
import {
  FinanceOperation,
  IFinanceOperation,
  IInitialFinanceOperation,
  ISetFinanceOperationStateProps,
  IUpdateOperationValueResult,
  TUpdateOperationObject,
} from '../../../mongo/models/finance/operation.model';
import { ApiResponse } from '../../types';
import { AuthRequest } from '../plannings/types';
import { SessionController } from '../session/session.controller';

export abstract class FinanceApiController {
  static async createFinanceModel(
    req: AuthRequest<{
      _id: Types.ObjectId;
      sourceModel: FINANCE_MODEL_PATHS;
      title: string;
    }>,
    res: ApiResponse<IFinance>
  ): Promise<ApiResponse<IFinance>> {
    try {
      const { user: partialUser, body } = req;

      const user = new SessionController(partialUser).checkUser();

      const financeModel = await Finance.createFinanceModel(
        body._id,
        body.sourceModel,
        user._id,
        body.title
      );

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(
          financeModel,
          'Финансовая модель успешно создана'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }

  static async removeFinanceModel(
    req: AuthRequest<object, { modelId: Types.ObjectId }>,
    res: ApiResponse
  ): Promise<ApiResponse> {
    try {
      const { params } = req;

      await Finance.removeModel(params.modelId);

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(
          null,
          'Фин. Модель успешно удалена'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }

  static async getFinanceModel(
    req: AuthRequest<
      object,
      { _id: Types.ObjectId; sourceModel: FINANCE_MODEL_PATHS }
    >,
    res: ApiResponse<Array<IFinance>>
  ): Promise<ApiResponse<Array<IFinance>>> {
    try {
      const {
        params: { _id, sourceModel },
      } = req;

      const model: Array<HydratedDocument<IFinance>> | null =
        await Finance.find({
          model: _id,
          modelPath: sourceModel,
        });

      if (!model) {
        throw new ResponseException(
          ResponseException.createObject(
            404,
            'error',
            'Не удалось найти фин. модель',
            null
          )
        );
      }

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(model)
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }

  static async createOperation(
    req: AuthRequest<Omit<IInitialFinanceOperation, 'user'>>,
    res: ApiResponse<IUpdateOperationValueResult>
  ): Promise<ApiResponse<IUpdateOperationValueResult>> {
    try {
      const { user, body } = req;

      const confirmedUser = new SessionController(user).checkUser();

      const result = await FinanceOperation.createOperation({
        ...body,
        user: confirmedUser._id,
      });

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(
          result,
          'Операция успешно добавлена'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }

  static async updateOperation(
    req: AuthRequest<TUpdateOperationObject & { _id: Types.ObjectId }>,
    res: ApiResponse<IUpdateOperationValueResult | null>
  ): Promise<ApiResponse<IUpdateOperationValueResult | null>> {
    try {
      const { body } = req;

      const result = await FinanceOperation.updateValueById(body._id, body);

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(
          result,
          'Операция успешно обновлена'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }

  static async updateOperationState(
    req: AuthRequest<ISetFinanceOperationStateProps>,
    res: ApiResponse<IFinanceOperation | null>
  ): Promise<ApiResponse<IFinanceOperation | null>> {
    try {
      const { body } = req;

      const result = await FinanceOperation.setStateById(body);

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(
          result,
          'Статус операции успешно обновлен'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }

  static async removeOperation(
    req: AuthRequest<{ _id: Types.ObjectId }>,
    res: ApiResponse<IFinance | null>
  ): Promise<ApiResponse<IFinance | null>> {
    try {
      const { body } = req;

      const financeModel = await FinanceOperation.removeOperation(body._id);

      const { json, status } = new ResponseException(
        ResponseException.createSuccessObject(
          financeModel,
          'Операция успешно удалена'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }

  static async getOperationsByModelId(
    req: AuthRequest<object, { modelId: Types.ObjectId }>,
    res: ApiResponse<Array<IFinanceOperation>>
  ): Promise<ApiResponse<Array<IFinanceOperation>>> {
    try {
      const { params } = req;

      const list = await FinanceOperation.findByFinanceModelId(params.modelId);

      if (!list) {
        throw new ResponseException(
          ResponseException.createObject(
            404,
            'error',
            'Не удалось найти список операций',
            null
          )
        );
      }

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(list)
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }
}
