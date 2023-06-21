import { model, Schema } from 'mongoose';
import { DB_MODEL_NAMES } from '../../helpers/enums';

const FinanceAccountSchema = new Schema({});

export const FinanceAccount = model(
  DB_MODEL_NAMES.financeAccount,
  FinanceAccountSchema
);
