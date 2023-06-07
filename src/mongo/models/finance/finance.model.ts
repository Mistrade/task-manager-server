import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { utcDate } from '../../../common/common';
import { ResponseException } from '../../../exceptions/response.exception';
import { DB_MODEL_NAMES } from '../../helpers/enums';
import { sumProfit, sumProfitPercent } from '../../helpers/finance.utils';
import {
  FinanceAnalyticSchema,
  IFinanceAnalyticSchema,
  IPopulatedFinanceAnalytic,
} from './finance-analytic.schema';
import {
  FINANCE_OPERATION_TYPES,
  FinanceOperation,
  IFinanceOperation,
  TFinanceOperationDifference,
} from './operation.model';

export enum FINANCE_MODEL_PATHS {
  'EVENT' = 'Event',
}

export interface IFinance {
  _id: Types.ObjectId;
  title: string;
  model: Types.ObjectId;
  modelPath: FINANCE_MODEL_PATHS;
  analytic: IFinanceAnalyticSchema;
  lastForceRefresh: Date;
  createdAt: Date;
  updatedAt: Date;
  user: Types.ObjectId;
}

export interface IFinanceWithPopulatedBestFields
  extends Omit<IFinance, 'analytic'> {
  analytic: IPopulatedFinanceAnalytic;
}

interface IUpdateFinanceModelAnalyticByDifference {
  modelId: Types.ObjectId;
  difference: TFinanceOperationDifference;
}

interface IFinanceMethods {
  dontUseMethod(): void;
}

type PreModel = Model<IFinance, object, IFinanceMethods>;

interface IFinanceStatics {
  updateAnalyticByOperationDifference(
    data: IUpdateFinanceModelAnalyticByDifference
  ): Promise<HydratedDocument<IFinanceWithPopulatedBestFields> | null>;

  findByEventId(
    eventId: Types.ObjectId
  ): Promise<HydratedDocument<IFinance, IFinanceMethods> | null>;

  createFinanceModel(
    sourceModelId: Types.ObjectId,
    modelPath: FINANCE_MODEL_PATHS,
    user: Types.ObjectId,
    title: string
  ): Promise<HydratedDocument<IFinance>>;

  removeModel(_id: Types.ObjectId): Promise<void>;
}

type FinanceModel = PreModel & IFinanceStatics;

const initialAnalyticState: Omit<IFinanceAnalyticSchema, 'updatedAt'> = {
  income: 0,
  consumption: 0,
  profit: 0,
  profitPercent: 0,
  bestConsumptionOperation: null,
  bestIncomeOperation: null,
  consumptionOperationCount: 0,
  operationsCount: 0,
  incomesOperationCount: 0,
};

const schema = new Schema<
  IFinance,
  FinanceModel,
  IFinanceMethods,
  object,
  object,
  IFinanceStatics
>(
  {
    model: {
      type: Schema.Types.ObjectId,
      refPath: 'modelPath',
      required: true,
    },
    modelPath: {
      type: String,
      enum: [DB_MODEL_NAMES.eventModel],
      required: true,
    },
    analytic: {
      type: FinanceAnalyticSchema,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      maxlength: [80, 'Название фин. модели должно быть не более 80 символов'],
      minlength: [1, 'Название фин. модели должно быть длиннее 1 символа'],
      required: [true, 'Название фин. модели обязательно для заполнения'],
    },
    lastForceRefresh: {
      type: Date,
      default: () => utcDate(new Date()),
    },
  },
  {
    timestamps: true,
    statics: {
      async findByEventId(
        eventId: Types.ObjectId
      ): Promise<HydratedDocument<IFinance, IFinanceMethods> | null> {
        return Finance.findOne({
          model: eventId,
          modelPath: FINANCE_MODEL_PATHS.EVENT,
        });
      },
      async updateAnalyticByOperationDifference(
        data: IUpdateFinanceModelAnalyticByDifference
      ): Promise<HydratedDocument<IFinanceWithPopulatedBestFields> | null> {
        const {
          difference: {
            prevOperationType,
            operationType,
            resultDifference,
            operationsCount,
            prevConsumption,
            prevIncome,
            item,
            action,
          },
        } = data;

        if (resultDifference === 0) {
          return null;
        }

        // const model: HydratedDocument<IFinanceWithPopulatedBestFields> | null =
        let model: HydratedDocument<IFinance> | null = await Finance.findById(
          data.modelId
        );

        if (!model) {
          throw new ResponseException(
            ResponseException.createObject(
              404,
              'error',
              'Не удалось найти финансовую модель'
            )
          );
        }

        switch (operationType) {
          case FINANCE_OPERATION_TYPES.CONSUMPTION:
            model.analytic.consumption += resultDifference;

            //Удаление или добавление
            if (operationsCount !== 0) {
              model.analytic.operationsCount += operationsCount;
              model.analytic.consumptionOperationCount += operationsCount;
            }
            //Изменение типа операции
            else if (prevOperationType === FINANCE_OPERATION_TYPES.INCOME) {
              model.analytic.income -= prevIncome;
              model.analytic.incomesOperationCount--;
              model.analytic.consumptionOperationCount++;
            }

            //Если тип операции создание или обновление мне нужно выполнить логику проверки топовой операции
            if ((action === 'create' || action === 'update') && item) {
              try {
                //Если топовой операции расхода ранее не было, то устанавливаю текущую
                if (!model.analytic.bestConsumptionOperation) {
                  model.analytic.bestConsumptionOperation = item._id;
                }
                //Иначе нужно будет найти предыдущую в базе и сравнить с текущей
                else {
                  //Ищу в базе
                  const bestConsumption: HydratedDocument<IFinanceOperation> | null =
                    await FinanceOperation.findById(
                      model.analytic.bestConsumptionOperation
                    );

                  //Если не найдено или у предыдущей результат меньше, чем у текущей, то устанавливаю текущую
                  //В противных случаях - ничего не делаю
                  if (
                    !bestConsumption ||
                    Math.abs(bestConsumption.result) < Math.abs(item.result)
                  ) {
                    model.analytic.bestConsumptionOperation = item._id;
                  }
                }
              } catch (e) {
                console.error(e);
              }
            }
            //Здесь обработка сценария на удаление финансовой операции
            else {
              try {
                const res: IFinanceOperation | null =
                  await FinanceOperation.fetchAndFilterBestOperation(
                    model._id,
                    operationType
                  );
                model.analytic.bestConsumptionOperation = res?._id || null;
              } catch (e) {
                console.error(e);
              }
            }

            break;
          case FINANCE_OPERATION_TYPES.INCOME:
            model.analytic.income += resultDifference;

            if (operationsCount !== 0) {
              model.analytic.operationsCount += operationsCount;
              model.analytic.incomesOperationCount += operationsCount;
            } else if (
              prevOperationType === FINANCE_OPERATION_TYPES.CONSUMPTION
            ) {
              model.analytic.consumption -= prevConsumption;
              model.analytic.incomesOperationCount++;
              model.analytic.consumptionOperationCount--;
            }

            //Если тип операции создание или обновление мне нужно выполнить логику проверки топовой операции
            if ((action === 'create' || action === 'update') && item) {
              try {
                //Если топовой операции расхода ранее не было, то устанавливаю текущую
                if (!model.analytic.bestIncomeOperation) {
                  model.analytic.bestIncomeOperation = item._id;
                }
                //Иначе нужно будет найти предыдущую в базе и сравнить с текущей
                else {
                  //Ищу в базе
                  const bestIncome: HydratedDocument<IFinanceOperation> | null =
                    await FinanceOperation.findById(
                      model.analytic.bestIncomeOperation
                    );

                  //Если не найдено или у предыдущей результат меньше, чем у текущей, то устанавливаю текущую
                  //В противных случаях - ничего не делаю
                  if (
                    !bestIncome ||
                    Math.abs(bestIncome.result) < Math.abs(item.result)
                  ) {
                    model.analytic.bestIncomeOperation = item._id;
                  }
                }
              } catch (e) {
                console.error(e);
              }
            }
            //Здесь обработка сценария на удаление финансовой операции
            else {
              try {
                const res: IFinanceOperation | null =
                  await FinanceOperation.fetchAndFilterBestOperation(
                    model._id,
                    operationType
                  );
                model.analytic.bestIncomeOperation = res?._id || null;
              } catch (e) {
                console.error(e);
              }
            }

            break;
          default:
            return null;
        }

        model.analytic.profit = sumProfit({
          income: model.analytic.income,
          consumption: model.analytic.consumption,
        });
        model.analytic.profitPercent = sumProfitPercent({
          profit: model.analytic.profit,
          income: model.analytic.income,
        });

        await model.save(
          {
            validateModifiedOnly: true,
            validateBeforeSave: true,
          },
          function (error, result) {
            if (error) {
              throw new ResponseException(
                ResponseException.createObject(500, 'error', error.message)
              );
            }
          }
        );

        const populatedFields: Array<keyof IFinanceAnalyticSchema> = [
          'bestIncomeOperation',
          'bestConsumptionOperation',
        ];
        const populatePath: keyof IFinance = 'analytic';

        const result: HydratedDocument<IFinanceWithPopulatedBestFields> =
          await model.populate({
            path: populatePath,
            populate: populatedFields,
          });

        return result;
      },
      async createFinanceModel(
        sourceModelId: Types.ObjectId,
        modelPath: FINANCE_MODEL_PATHS,
        user: Types.ObjectId,
        title: string
      ): Promise<HydratedDocument<IFinance>> {
        return await Finance.create({
          title,
          user,
          model: sourceModelId,
          modelPath,
          analytic: initialAnalyticState,
        });
      },

      async removeModel(_id: Types.ObjectId): Promise<void> {
        const model: HydratedDocument<IFinance> | null =
          await Finance.findByIdAndRemove(_id);

        if (!model) {
          throw new ResponseException(
            ResponseException.createObject(
              404,
              'error',
              'Не удалось найти фин. модель'
            )
          );
        }

        return await FinanceOperation.removeByModelId(model._id);
      },
    },
  }
);

export const Finance = model<IFinance, FinanceModel>(
  DB_MODEL_NAMES.financeModel,
  schema
);
