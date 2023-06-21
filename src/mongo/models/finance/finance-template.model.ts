import { model, Schema } from 'mongoose';
import { DB_MODEL_NAMES } from '../../helpers/enums';

const FinanceTemplateSchema = new Schema({});

export const FinanceTemplate = model(
  DB_MODEL_NAMES.financeTemplate,
  FinanceTemplateSchema
);
