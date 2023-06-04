import { Schema, Types } from 'mongoose';

export interface IFinanceAnalyticSchema {
  income: number; //доход
  consumption: number; //расход
  operationsCount: number; //Кол-во операций
  incomesOperationCount: number; //Кол-во доходных операций
  consumptionOperationCount: number; //Кол-во расходных операций
  bestIncomeOperation: Types.ObjectId | null; //Наиболее доходная операция
  bestConsumptionOperation: Types.ObjectId | null; //Наиболее расходная операция
  profit: number; //virtual - профит
  profitPercent: number; //virtual - профит в процентах
  updatedAt: Date; //Дата последнего обновления
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
