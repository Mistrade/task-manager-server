import express from 'express';
import { FinanceApiController } from './controller';

const router = express.Router();

router.get(
  '/models/:sourceModel/:_id',
  FinanceApiController.getFinanceModelsBySourceModelId
); //Получить фин.модели +

router.get('/model/:modelId', FinanceApiController.getFinanceModelById); //Пересчитать данные аналитики по фин.модели +
router.post('/model', FinanceApiController.createFinanceModel); //Создание фин.модели +
router.patch('/model', FinanceApiController.updateFinanceModel); //TODO Редактирование фин. модели
router.delete('/model/:modelId', FinanceApiController.removeFinanceModel); //Удалить фин.модель +

router.post('/operation', FinanceApiController.createOperation); //Создание операции +
router.patch('/operation', FinanceApiController.updateOperation); //Обновление созданной операции +
router.patch('/operation/state', FinanceApiController.updateOperationState); //Обновление созданной операции +
router.delete('/operation', FinanceApiController.removeOperation); //Удаление операции +

router.get('/operations/:modelId', FinanceApiController.getOperationsByModelId); //Получить список всех операций по ИД фин.модели +
router.post('/find_operations'); //TODO Поиск операций по фильтрам: Id счета, категории, цели, шаблону и т.д.

router.post('/total', FinanceApiController.getTotalSample); //Получить общую сводку по событиям в диапазоне дат +

router.get('/finance_account'); //TODO Получить список счетов
router.post('/finance_account'); //TODO Создать счет
router.patch('/finance_account'); //TODO Редактировать счет
router.delete('/finance_account'); //TODO Удалить счет

router.get('/categories'); //TODO Получить список категорий
router.post('/categories'); //TODO Создать категорию операций
router.patch('/categories'); //TODO Редактировать категорию операций
router.delete('/categories'); //TODO Удалить категорию операций

router.get('/targets'); //TODO Получить список целей
router.post('/targets'); //TODO Создать цель
router.patch('/targets'); //TODO Редактировать цель
router.delete('/targets'); //TODO Удалить цель

router.get('/templates'); //TODO Получить список шаблонов
router.post('/templates'); //TODO Создать шаблон
router.patch('/templates'); //TODO Редактировать шаблон
router.delete('/templates'); //TODO Удалить шаблон

export const FinanceRouter = router;
