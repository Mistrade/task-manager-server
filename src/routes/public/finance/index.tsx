import express from 'express';
import { FinanceApiController } from './controller';

const router = express.Router();

router.post('/model', FinanceApiController.createFinanceModel); //Создание фин.модели +
router.get('/model/:modelId', FinanceApiController.getFinanceModelById); //Пересчитать данные аналитики по фин.модели
router.delete('/model/:modelId', FinanceApiController.removeFinanceModel); //Удалить фин.модель
router.get(
  '/models/:sourceModel/:_id',
  FinanceApiController.getFinanceModelsBySourceModelId
); //Получить фин.модели +

router.post('/operation', FinanceApiController.createOperation); //Создание операции +
router.patch('/operation', FinanceApiController.updateOperation); //Обновление созданной операции +
router.patch('/operation/state', FinanceApiController.updateOperationState); //Обновление созданной операции +
router.delete('/operation', FinanceApiController.removeOperation); //Удаление операции +

router.get('/operations/:modelId', FinanceApiController.getOperationsByModelId); //Получить список всех операций по ИД фин.модели +

export const FinanceRouter = router;
