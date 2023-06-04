import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { ResponseException } from '../../../exceptions/response.exception';
import { DB_MODEL_NAMES } from '../../helpers/enums';
import {
  FinanceAnalyticSchema,
  IFinanceAnalyticSchema,
} from './finance-analytic.schema';
import {
  FINANCE_OPERATION_TYPES,
  FinanceOperation,
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
  createdAt: Date;
  updatedAt: Date;
  user: Types.ObjectId;
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
  ): Promise<HydratedDocument<IFinance> | null>;

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
      ): Promise<HydratedDocument<IFinance> | null> {
        const {
          difference: { operationType, resultDifference, operationsCount },
        } = data;

        if (resultDifference === 0) {
          return null;
        }

        const model: HydratedDocument<IFinance> | null = await Finance.findById(
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

            if (operationsCount !== 0) {
              model.analytic.operationsCount += operationsCount;
              model.analytic.consumptionOperationCount += operationsCount;
            }

            break;
          case FINANCE_OPERATION_TYPES.INCOME:
            model.analytic.income += resultDifference;

            if (operationsCount !== 0) {
              model.analytic.operationsCount += operationsCount;
              model.analytic.incomesOperationCount += operationsCount;
            }

            break;
          default:
            return null;
        }

        model.analytic.profit =
          model.analytic.income - model.analytic.consumption;
        model.analytic.profitPercent =
          (model.analytic.profit / (model.analytic.income || 1)) * 100;

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

        return model;
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
