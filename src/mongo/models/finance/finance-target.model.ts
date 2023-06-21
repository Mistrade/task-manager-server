import { model, Schema } from 'mongoose';
import { DB_MODEL_NAMES } from '../../helpers/enums';

const FinanceTargetSchema = new Schema({});

export const FinanceTarget = model(
  DB_MODEL_NAMES.financeTarget,
  FinanceTargetSchema
);
