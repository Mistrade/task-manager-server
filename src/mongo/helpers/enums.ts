export enum DB_MODEL_NAMES {
  'eventModel' = 'Event',
  'financeModel' = 'Finance',
  'financeOperationModel' = 'FinanceOperation',
  'eventWidget' = 'EventWidget',
  'checkList' = 'CheckList',
  'user' = 'User',
  'eventInvite' = 'EventInvite',
  'eventGroup' = 'Group',
  'financeAccount' = 'FinanceAccount',
  'financeTarget' = 'FinanceTarget',
  'financeTemplate' = 'FinanceTemplate',
  'financeCategory' = 'FinanceCategory',
}

export enum EVENT_PRIORITY {
  'MEDIUM' = 'medium',
  'LOW' = 'low',
  'HIGH' = 'high',
  'VERY_HIGH' = 'veryHigh',
  'VERY_LOW' = 'veryLow',
}

export enum EVENT_STATUSES {
  'COMPLETED' = 'completed',
  'CREATED' = 'created',
  'IN_PROGRESS' = 'in_progress',
  'REVIEW' = 'review',
  'ARCHIVE' = 'archive',
}
