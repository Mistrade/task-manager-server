import {
  FilterQuery,
  HydratedDocument,
  model,
  Model,
  Schema,
  Types,
} from 'mongoose';
import { ResponseException } from '../../../exceptions/response.exception';
import { DB_MODEL_NAMES } from '../../helpers/enums';
import { TUserOmitPassword } from '../user.model';
import {
  Finance,
  IFinance,
  IFinanceWithPopulatedBestFields,
} from './finance.model';

export enum FINANCE_OPERATION_TYPES {
  'INCOME' = 'income',
  'CONSUMPTION' = 'consumption',
}

export interface IInitialFinanceOperation {
  model: Types.ObjectId;
  name: string;
  date: Date | null;
  operationType: FINANCE_OPERATION_TYPES;
  value: number;
  count: number;
  user: Types.ObjectId;
  description?: string;
  eventId?: Types.ObjectId | null;
  includeInTotalSample: boolean;
}

export interface IFinanceOperation {
  linkToEventId: Types.ObjectId;
  _id: Types.ObjectId;
  model: Types.ObjectId;
  name: string;
  date: Date;
  operationType: FINANCE_OPERATION_TYPES;
  value: number;
  count: number;
  result: number;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  events: Array<Types.ObjectId>;
  state: boolean;
  includeInTotalSample: boolean;
  financeAccount: Types.ObjectId;
  financeTarget: Types.ObjectId | null;
  fromTemplate: Types.ObjectId | null;
  category: Array<Types.ObjectId>;
}

export type TFinanceOperationDifference = Pick<
  IFinanceOperation,
  'operationType'
> & {
  action: 'create' | 'update' | 'remove';
  resultDifference: number;
  operationsCount: number;
  prevOperationType: FINANCE_OPERATION_TYPES;
  prevIncome: number;
  prevConsumption: number;
  item: IFinanceOperation | null;
};

export interface IUpdateOperationValueResult {
  operation: HydratedDocument<IFinanceOperation>;
  financeModel?: HydratedDocument<IFinanceWithPopulatedBestFields> | null;
}

interface IFinanceOperationMethods {
  dontUseMethod(): void;
}

type PreModel = Model<IFinanceOperation, object, IFinanceOperationMethods>;

export type TUpdateOperationObject = Pick<
  IFinanceOperation,
  | 'value'
  | 'count'
  | 'date'
  | 'name'
  | 'description'
  | 'operationType'
  | 'includeInTotalSample'
>;

export interface ISetFinanceOperationStateProps {
  _id: Types.ObjectId;
  state: boolean;
}

interface IFinanceOperationStatics {
  findByFinanceModelId(
    financeModelId: Types.ObjectId,
    filters?: FilterQuery<IFinanceOperation>
  ): Promise<Array<HydratedDocument<IFinanceOperation>> | null>;

  findByUserId(
    userId: Types.ObjectId,
    filters?: FilterQuery<TUserOmitPassword>
  ): Promise<Array<HydratedDocument<IFinanceOperation>> | null>;

  updateValueById(
    _id: Types.ObjectId,
    data: TUpdateOperationObject
  ): Promise<IUpdateOperationValueResult | null>; //TODO Подумай что возвращать

  createOperation(
    data: IInitialFinanceOperation
  ): Promise<IUpdateOperationValueResult>;

  removeOperation(
    _id: Types.ObjectId
  ): Promise<IFinanceWithPopulatedBestFields | null>;

  removeByModelId(_id: Types.ObjectId): Promise<void>;

  setStateById(
    props: ISetFinanceOperationStateProps
  ): Promise<HydratedDocument<IFinanceOperation> | null>;

  fetchAndFilterBestOperation(
    this: FinanceOperationModel,
    modelId: Types.ObjectId,
    operationType: FINANCE_OPERATION_TYPES
  ): Promise<HydratedDocument<IFinanceOperation> | null>;
}

export type FinanceOperationModel = PreModel & IFinanceOperationStatics;

export type SchemaType = Schema<
  IFinanceOperation,
  FinanceOperationModel,
  IFinanceOperationMethods,
  object,
  object,
  IFinanceOperationStatics
>;

export const schema: SchemaType = new Schema<
  IFinanceOperation,
  FinanceOperationModel,
  IFinanceOperationMethods,
  object,
  object,
  IFinanceOperationStatics
>(
  {
    financeAccount: {
      type: Schema.Types.ObjectId,
      ref: DB_MODEL_NAMES.financeAccount,
      required: true,
    },
    financeTarget: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: DB_MODEL_NAMES.financeTarget,
    },
    fromTemplate: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: DB_MODEL_NAMES.financeTemplate,
    },
    category: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: DB_MODEL_NAMES.financeCategory,
        },
      ],
      default: [],
    },
    model: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: DB_MODEL_NAMES.financeModel,
    },
    linkToEventId: {
      type: Schema.Types.ObjectId,
      ref: DB_MODEL_NAMES.eventModel,
      required: true,
    },
    name: {
      type: String,
      minLength: [1, 'Название операции не может быть пустым'],
      maxLength: [80, 'Название операции должно быть не более 80 символов'],
      required: [true, 'Название операции обязательно для заполнения'],
    },
    date: {
      type: Date,
      required: true,
    },
    includeInTotalSample: {
      type: Boolean,
      required: true,
      default: true,
    },
    result: {
      type: Number,
      required: true,
      min: [1, 'Итоговая сумма операции должна быть больше 0'],
    },
    operationType: {
      type: String,
      enum: Object.values(FINANCE_OPERATION_TYPES),
      required: true,
    },
    value: {
      type: Number,
      min: [1, 'Сумма операции должна быть больше 0'],
      required: [true, 'Сумма операции обязательна для заполнения'],
    },
    count: {
      type: Number,
      min: [1, 'Количество совершенных операций не может быть ниже 1'],
      default: 1,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    description: {
      type: String,
      maxlength: [300, 'Комментарий должен быть не длиннее 300 символов'],
      default: '',
    },
    events: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: DB_MODEL_NAMES.eventModel,
        },
      ],
      default: [],
    },
    state: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    statics: {
      async fetchAndFilterBestOperation(
        this: FinanceOperationModel,
        modelId: Types.ObjectId,
        operationType: FINANCE_OPERATION_TYPES
      ): Promise<HydratedDocument<IFinanceOperation> | null> {
        const arr: Array<HydratedDocument<IFinanceOperation>> = await this.find(
          { model: modelId, operationType }
        );

        if (!arr || arr.length === 0) {
          return null;
        }

        let max: HydratedDocument<IFinanceOperation> | null = null;

        arr.forEach((item) => {
          if (max) {
            if (max.result < item.result) {
              max = item;
            }
          } else {
            max = item;
          }
        });

        return max;
      },
      async setStateById({
        _id,
        state,
      }: ISetFinanceOperationStateProps): Promise<HydratedDocument<IFinanceOperation> | null> {
        const operation = await FinanceOperation.findById(_id);

        if (!operation) {
          throw new ResponseException(
            ResponseException.createObject(
              404,
              'error',
              'Не удалось найти операцию',
              null
            )
          );
        }

        operation.state = state;

        await operation.save(function (err) {
          if (err) {
            throw new ResponseException(
              ResponseException.createObject(
                500,
                'error',
                'Не удалось обновить статус операции',
                null
              )
            );
          }
        });

        return operation;
      },

      /**
       * @param userId - идентификатор пользователя
       * @param filters - дополнительные фильтры
       */
      async findByUserId(
        userId: Types.ObjectId,
        filters?: FilterQuery<TUserOmitPassword>
      ): Promise<Array<HydratedDocument<IFinanceOperation>> | null> {
        return FinanceOperation.find({
          ...filters,
          user: userId,
        });
      },
      /**
       * @param financeModelId - Идентификатор финансовой модели
       * @param filters - Дополнительные фильтры
       */
      async findByFinanceModelId(
        financeModelId: Types.ObjectId,
        filters?: FilterQuery<IFinanceOperation>
      ): Promise<Array<HydratedDocument<IFinanceOperation>> | null> {
        return FinanceOperation.find({
          ...filters,
          model: financeModelId,
        });
      },
      /**
       * @param _id - Идентификатор операции
       * @param data - Обновленные значения суммы операции и количества
       * @method updateValueById
       * @description Логика работы метода.
       *
       * 1. Выполняется поиск, и обновляется документ операции.
       * 2. Выполняется поиск финансовой модели, и подсчитывается аналитика, вызывая метод (methodName)
       */
      async updateValueById(
        _id: Types.ObjectId,
        data: TUpdateOperationObject
      ): Promise<IUpdateOperationValueResult | null> {
        const operation: HydratedDocument<IFinanceOperation> | null =
          await FinanceOperation.findById(_id);

        if (!operation) {
          throw new ResponseException(
            ResponseException.createObject(
              404,
              'error',
              'Не удалось найти операцию',
              null
            )
          );
        }

        const checkResultDiff = () => {
          if (data.value !== undefined && data.count === undefined) {
            return data.value - operation.value;
          }

          if (data.value === undefined && data.count !== undefined) {
            return data.count * operation.value;
          }

          if (data.value !== undefined && data.count !== undefined) {
            return data.value * data.count - operation.value * operation.count;
          }

          return 0;
        };

        let difference: TFinanceOperationDifference;

        if (data.operationType !== operation.operationType) {
          if (data.operationType === FINANCE_OPERATION_TYPES.INCOME) {
            difference = {
              action: 'update',
              operationType: FINANCE_OPERATION_TYPES.INCOME,
              prevOperationType: FINANCE_OPERATION_TYPES.CONSUMPTION,
              resultDifference: Math.abs(data.value * data.count),
              operationsCount: 0,
              prevIncome: 0,
              prevConsumption: operation.result,
              item: null,
            };
          } else {
            difference = {
              action: 'update',
              operationType: FINANCE_OPERATION_TYPES.CONSUMPTION,
              prevOperationType: FINANCE_OPERATION_TYPES.INCOME,
              resultDifference: Math.abs(data.value * data.count),
              operationsCount: 0,
              prevIncome: operation.result,
              prevConsumption: 0,
              item: null,
            };
          }
        } else {
          difference = {
            action: 'update',
            prevOperationType: operation.operationType,
            operationType: data.operationType,
            resultDifference: checkResultDiff(),
            operationsCount: 0,
            prevIncome:
              operation.operationType === FINANCE_OPERATION_TYPES.INCOME
                ? operation.result
                : 0,
            prevConsumption:
              operation.operationType === FINANCE_OPERATION_TYPES.CONSUMPTION
                ? operation.result
                : 0,
            item: null,
          };
        }

        operation.value = data.value;
        operation.count = data.count;
        operation.name = data.name;
        operation.date = data.date;
        operation.result = Math.abs(operation.count * operation.value);
        operation.description = data.description;
        operation.operationType = data.operationType;
        operation.includeInTotalSample = !!data.includeInTotalSample;

        await operation.save(
          {
            validateBeforeSave: true,
            validateModifiedOnly: true,
          },
          async function (error, result) {
            if (error) {
              throw new ResponseException(
                ResponseException.createObject(
                  500,
                  'error',
                  error.message,
                  null
                )
              );
            }
          }
        );

        difference.item = operation;

        if (difference.resultDifference === 0) {
          return {
            operation,
          };
        }

        try {
          const financeModel: HydratedDocument<IFinanceWithPopulatedBestFields> | null =
            await Finance.updateAnalyticByOperationDifference({
              modelId: operation.model._id,
              difference,
            });

          return {
            financeModel,
            operation,
          };
        } catch (e: any) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              e?.message || 'Не удалось обновить финансовую модель',
              { operation }
            )
          );
        }
      },
      /**
       *
       */
      async createOperation(
        data: IInitialFinanceOperation
      ): Promise<IUpdateOperationValueResult> {
        const model: HydratedDocument<IFinance> | null = await Finance.findOne({
          _id: data.model,
        });

        if (!model) {
          throw new ResponseException(
            ResponseException.createObject(404, 'error', 'Модель не найдена!')
          );
        }

        const operation: HydratedDocument<IFinanceOperation> =
          await FinanceOperation.create({
            ...data,
            linkToEventId: model.model,
            result: Math.abs(data.count) * Math.abs(data.value),
          });

        try {
          const difference: TFinanceOperationDifference = {
            action: 'create',
            prevOperationType: data.operationType,
            operationType: data.operationType,
            operationsCount: 1,
            resultDifference: data.value * data.count,
            prevConsumption: 0,
            prevIncome: 0,
            item: operation,
          };

          const financeModel: HydratedDocument<IFinanceWithPopulatedBestFields> | null =
            await Finance.updateAnalyticByOperationDifference({
              difference,
              modelId: operation.model._id,
            });

          return {
            operation,
            financeModel,
          };
        } catch (e: Error | any) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              e?.message || 'Не удалось обновить аналитику',
              { operation }
            )
          );
        }
      },

      async removeOperation(
        _id: Types.ObjectId
      ): Promise<IFinanceWithPopulatedBestFields | null> {
        const operation: HydratedDocument<IFinanceOperation> | null =
          await FinanceOperation.findOneAndDelete({
            _id,
          });

        if (!operation) {
          throw new ResponseException(
            ResponseException.createObject(
              404,
              'error',
              'Не удалось найти операцию',
              null
            )
          );
        }

        const diff: TFinanceOperationDifference = {
          action: 'remove',
          operationType: operation.operationType,
          resultDifference: -1 * operation.value * operation.count,
          operationsCount: -1,
          prevOperationType: operation.operationType,
          prevConsumption:
            operation.operationType === FINANCE_OPERATION_TYPES.CONSUMPTION
              ? operation.result
              : 0,
          prevIncome:
            operation.operationType === FINANCE_OPERATION_TYPES.INCOME
              ? operation.result
              : 0,
          item: null,
        };

        try {
          const financeModel: HydratedDocument<IFinanceWithPopulatedBestFields> | null =
            await Finance.updateAnalyticByOperationDifference({
              modelId: operation.model,
              difference: diff,
            });

          return financeModel;
        } catch (e) {
          throw new ResponseException(
            ResponseException.createObject(
              500,
              'error',
              'Не удалось обновить аналитику, пожалуйста обновите вручную, нажав "обновить"',
              null
            )
          );
        }
      },
      async removeByModelId(_id: Types.ObjectId): Promise<any> {
        return FinanceOperation.deleteMany({
          model: _id,
        });
      },
    },
    methods: {},
  }
);

export const FinanceOperation = model<IFinanceOperation, FinanceOperationModel>(
  DB_MODEL_NAMES.financeOperationModel,
  schema
);
