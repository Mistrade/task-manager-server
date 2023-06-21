import { model, Schema } from 'mongoose';
import { DB_MODEL_NAMES } from '../../helpers/enums';

const FinanceCategorySchema = new Schema({});

export const FinanceCategory = model(
  DB_MODEL_NAMES.financeCategory,
  FinanceCategorySchema
);
