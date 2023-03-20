import { EventModelType } from '../../../mongo/models/event.model';
import express from 'express';
import { UserModelResponse } from '../session/types';

export interface AuthRequest<Data = any, Params = any>
  extends express.Request<Params, any, Data> {
  user?: UserModelResponse;
}

export type FilterTaskStatuses =
  | 'in_work'
  | 'completed'
  | 'archive'
  | 'created'
  | 'all';
export type ErrorTypes = 'info' | 'success' | 'warning' | 'error' | 'default';

export interface CustomResponseBody<T> {
  data: T | null;
  info?: {
    message: string;
    type: ErrorTypes;
  };
}

export interface ResponseReturned<T = any> {
  status: number;
  json: T;
}

export type EventModelFilters = Partial<{
  [key in keyof EventModelType | string]: any;
}>;
