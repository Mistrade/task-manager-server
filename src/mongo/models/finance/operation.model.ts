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
import { Finance, IFinance } from './finance.model';

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
}

export interface IFinanceOperation {
  _id: Types.ObjectId;
  model: Types.ObjectId;
  name: string;
  date: Date | null;
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
}

export type TFinanceOperationDifference = Pick<
  IFinanceOperation,
  'value' | 'count' | 'operationType'
> & {
  prevValue: number;
  prevCount: number;
  resultDifference: number;
  operationsCount: number;
};

export interface IUpdateOperationValueResult {
  operation: HydratedDocument<IFinanceOperation>;
  financeModel?: HydratedDocument<IFinance> | null;
}

interface IFinanceOperationMethods {
  dontUseMethod(): void;
}

type PreModel = Model<IFinanceOperation, object, IFinanceOperationMethods>;

export type TUpdateOperationObject = Pick<
  IFinanceOperation,
  'value' | 'count' | 'date' | 'name' | 'description'
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

  removeOperation(_id: Types.ObjectId): Promise<IFinance | null>;

  removeByModelId(_id: Types.ObjectId): Promise<void>;

  setStateById(
    props: ISetFinanceOperationStateProps
  ): Promise<HydratedDocument<IFinanceOperation> | null>;
}

export type FinanceOperationModel = PreModel & IFinanceOperationStatics;

export const schema = new Schema<
  IFinanceOperation,
  FinanceOperationModel,
  IFinanceOperationMethods,
  object,
  object,
  IFinanceOperationStatics
>(
  {
    model: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Finance',
    },
    name: {
      type: String,
      minLength: [1, 'Название операции не может быть пустым'],
      maxLength: [80, 'Название операции должно быть не более 80 символов'],
      required: [true, 'Название операции обязательно для заполнения'],
    },
    date: {
      type: Date,
      nullable: true,
      default: null,
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
          ref: 'Event',
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

        const difference: TFinanceOperationDifference = {
          value: data.value !== undefined ? data.value - operation.value : 0,
          count: data.count !== undefined ? data.count - operation.count : 0,
          operationType: operation.operationType,
          prevCount: operation.count,
          prevValue: operation.value,
          resultDifference: checkResultDiff(),
          operationsCount: 0,
        };

        operation.value = data.value;
        operation.count = data.count;
        operation.name = data.name;
        operation.date = data.date;
        operation.result = operation.count * operation.value;
        operation.description = data.description;

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

        if (difference.resultDifference === 0) {
          return {
            operation,
          };
        }

        try {
          const financeModel: HydratedDocument<IFinance> | null =
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
        const difference: TFinanceOperationDifference = {
          value: data.value,
          count: data.count,
          operationType: data.operationType,
          prevCount: 0,
          prevValue: 0,
          operationsCount: 1,
          resultDifference: data.value * data.count,
        };

        const operation: HydratedDocument<IFinanceOperation> =
          await FinanceOperation.create({
            ...data,
            result: difference.resultDifference,
          });

        try {
          const financeModel: HydratedDocument<IFinance> | null =
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

      async removeOperation(_id: Types.ObjectId): Promise<IFinance | null> {
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
          value: -1 * operation.value,
          count: -1 * operation.count,
          operationType: operation.operationType,
          prevValue: operation.value,
          prevCount: operation.count,
          resultDifference: -1 * operation.value * operation.count,
          operationsCount: -1,
        };

        try {
          const financeModel =
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
