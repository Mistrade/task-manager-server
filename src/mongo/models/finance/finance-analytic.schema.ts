import { Schema, Types } from 'mongoose';
import { IFinanceOperation } from './operation.model';

export interface IFinanceAnalyticSchema {
  //доход
  income: number;
  //расход
  consumption: number;
  //Кол-во операций
  operationsCount: number;
  //Кол-во доходных операций
  incomesOperationCount: number;
  //Кол-во расходных операций
  consumptionOperationCount: number;
  //Наиболее доходная операция
  bestIncomeOperation: Types.ObjectId | null;
  //Наиболее расходная операция
  bestConsumptionOperation: Types.ObjectId | null;
  //virtual - профит
  profit: number;
  //virtual - профит в процентах
  profitPercent: number;
  //Дата последнего обновления
  updatedAt: Date;
}

export interface IPopulatedFinanceAnalytic
  extends Omit<
    IFinanceAnalyticSchema,
    'bestConsumptionOperation' | 'bestIncomeOperation'
  > {
  bestIncomeOperation: IFinanceOperation | null;
  bestConsumptionOperation: IFinanceOperation | null;
}

export const FinanceAnalyticSchema = new Schema<IFinanceAnalyticSchema>(
  {
    income: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Сумма доходов не может быть отрицательным числом'],
    },
    profit: {
      type: Number,
      required: true,
      default: 0,
    },
    profitPercent: {
      type: Number,
      required: true,
      default: 0,
    },
    consumption: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Сумма расходов не может быть отрицательным числом'],
    },
    operationsCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Количество операций не может быть отрицательным числом'],
    },
    incomesOperationCount: {
      type: Number,
      required: true,
      default: 0,
      min: [
        0,
        'Количество доходных операций не может быть отрицательным числом',
      ],
    },
    consumptionOperationCount: {
      type: Number,
      required: true,
      default: 0,
      min: [
        0,
        'Количество расходных операций не может быть отрицательным числом',
      ],
    },
    bestIncomeOperation: {
      type: Schema.Types.ObjectId,
      ref: 'FinanceOperation',
      default: null,
    },
    bestConsumptionOperation: {
      type: Schema.Types.ObjectId,
      ref: 'FinanceOperation',
      default: null,
    },
  },
  {
    timestamps: { updatedAt: true },
  }
);
