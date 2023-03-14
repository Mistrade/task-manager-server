import express from 'express';
import { CustomResponseBody } from './public/plannings/types';

export type ApiResponse<Returned = null> = express.Response<
  CustomResponseBody<Returned>
>;
