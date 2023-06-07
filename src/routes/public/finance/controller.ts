import dayjs from 'dayjs';
import { HydratedDocument, Types } from 'mongoose';
import { utcDate } from '../../../common/common';
import {
  CatchErrorHandler,
  ResponseException,
} from '../../../exceptions/response.exception';
import {
  sumProfit,
  sumProfitPercent,
} from '../../../mongo/helpers/finance.utils';
import {
  IFinanceAnalyticSchema,
  IPopulatedFinanceAnalytic,
} from '../../../mongo/models/finance/finance-analytic.schema';
import {
  Finance,
  FINANCE_MODEL_PATHS,
  IFinance,
  IFinanceWithPopulatedBestFields,
} from '../../../mongo/models/finance/finance.model';
import {
  FINANCE_OPERATION_TYPES,
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
  static async getFinanceModelById(
    req: AuthRequest<null, { modelId: Types.ObjectId }>,
    res: ApiResponse<IFinanceWithPopulatedBestFields | null>
  ): Promise<ApiResponse<IFinanceWithPopulatedBestFields | null>> {
    try {
      const {
        params: { modelId },
      } = req;

      const model: HydratedDocument<IFinance> | null = await Finance.findById(
        modelId
      );

      if (!model) {
        throw new ResponseException(
          ResponseException.createObject(
            404,
            'error',
            'Не удалось найти модель для подсчета аналитики по фин. модели',
            null
          )
        );
      }

      const agreementCondition = dayjs(model.lastForceRefresh).add(
        15,
        'second'
      );
      const diff = agreementCondition.diff(dayjs(), 'second');

      console.log('дата следующего доступного обновления', agreementCondition);
      console.log('разница с датой следующего доступного обновления', diff);

      if (diff > 0) {
        throw new ResponseException(
          ResponseException.createObject(
            403,
            'error',
            `Обновление финансовой модели будет доступно через ${diff} секунд.`,
            null
          )
        );
      }

      const operations: Array<HydratedDocument<IFinanceOperation>> | null =
        await FinanceOperation.findByFinanceModelId(modelId);

      if (!operations) {
        throw new ResponseException(
          ResponseException.createObject(
            404,
            'error',
            'Не удалось найти операции по запрашиваемой фин. модели',
            null
          )
        );
      }

      const analytic: IPopulatedFinanceAnalytic = {
        bestIncomeOperation: null, //
        bestConsumptionOperation: null, //
        profit: 0,
        profitPercent: 0,
        income: 0, //
        consumption: 0, //
        incomesOperationCount: 0, //
        consumptionOperationCount: 0, //
        operationsCount: 0, //
        updatedAt: utcDate(new Date()),
      };

      operations.forEach((item) => {
        if (item.operationType === FINANCE_OPERATION_TYPES.INCOME) {
          analytic.income += item.result;
          analytic.incomesOperationCount++;

          if (!analytic.bestIncomeOperation) {
            analytic.bestIncomeOperation = item;
          } else {
            if (analytic.bestIncomeOperation.result < item.result) {
              analytic.bestIncomeOperation = item;
            }
          }
        } else {
          analytic.consumption += item.result;
          analytic.consumptionOperationCount++;

          if (!analytic.bestConsumptionOperation) {
            analytic.bestConsumptionOperation = item;
          } else {
            if (analytic.bestConsumptionOperation.result < item.result) {
              analytic.bestConsumptionOperation = item;
            }
          }
        }

        analytic.operationsCount++;
      });

      model.analytic.operationsCount = analytic.operationsCount;
      model.analytic.incomesOperationCount = analytic.incomesOperationCount;
      model.analytic.consumptionOperationCount =
        analytic.consumptionOperationCount;
      model.analytic.income = analytic.income;
      model.analytic.consumption = analytic.consumption;
      model.analytic.bestIncomeOperation =
        analytic.bestIncomeOperation?._id || null;
      model.analytic.bestConsumptionOperation =
        analytic.bestConsumptionOperation?._id || null;

      model.analytic.profit = sumProfit({
        income: model.analytic.income,
        consumption: model.analytic.consumption,
      });
      model.analytic.profitPercent = sumProfitPercent({
        profit: model.analytic.profit,
        income: model.analytic.income,
      });

      model.lastForceRefresh = utcDate(new Date());

      await model.save(function (err) {
        if (err) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              err.message ||
                'Не удалось пересчитать фин. модель, попробуйте снова...',
              null
            )
          );
        }
      });

      const path: keyof IFinance = 'analytic';
      const populate: Array<keyof IFinance['analytic']> = [
        'bestIncomeOperation',
        'bestConsumptionOperation',
      ];

      let result: HydratedDocument<IFinanceWithPopulatedBestFields>;

      try {
        result = await model.populate({ path, populate });
      } catch (e) {
        throw new ResponseException(
          ResponseException.createObject(
            500,
            'error',
            'Произошла ошибка во время формирования результата фин. модели, попробуйте пожалуйста снова',
            null
          )
        );
      }

      const { status, json } = new ResponseException(
        ResponseException.createSuccessObject(
          result,
          'Фин.модель успешно пересчитана и обновлена'
        )
      );

      return res.status(status).json(json);
    } catch (e) {
      const { status, json } = CatchErrorHandler(e);
      return res.status(status).json(json);
    }
  }

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

  static async getFinanceModelsBySourceModelId(
    req: AuthRequest<
      object,
      { _id: Types.ObjectId; sourceModel: FINANCE_MODEL_PATHS }
    >,
    res: ApiResponse<Array<IFinanceWithPopulatedBestFields>>
  ): Promise<ApiResponse<Array<IFinanceWithPopulatedBestFields>>> {
    try {
      const {
        params: { _id, sourceModel },
      } = req;

      const populateKey: keyof IFinance = 'analytic';
      const populateFields: Array<keyof IFinanceAnalyticSchema> = [
        'bestConsumptionOperation',
        'bestIncomeOperation',
      ];

      const model: Array<
        HydratedDocument<IFinanceWithPopulatedBestFields>
      > | null = await Finance.find({
        model: _id,
        modelPath: sourceModel,
      }).populate({
        path: populateKey,
        populate: populateFields,
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
    res: ApiResponse<IFinanceWithPopulatedBestFields | null>
  ): Promise<ApiResponse<IFinanceWithPopulatedBestFields | null>> {
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
