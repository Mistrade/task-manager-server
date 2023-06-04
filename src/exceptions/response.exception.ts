import {
  CustomResponseBody,
  ErrorTypes,
  ResponseReturned,
} from '../routes/public/plannings/types';
import { ApiResponse } from '../routes/types';

export class ResponseException<T> {
  public status: number;
  public json: ResponseReturned<CustomResponseBody<T>>['json'];

  constructor(data: ResponseReturned<CustomResponseBody<T>>) {
    this.status = data.status;
    this.json = data.json;
  }

  public static createObject<T>(
    status: number,
    type: ErrorTypes,
    message: string,
    data: T | null = null
  ): ResponseException<T> {
    return {
      status,
      json: {
        data,
        info: { type, message },
      },
    };
  }

  public static createSuccessObject<T extends object | null>(
    data: T,
    message?: string
  ): ResponseException<T> {
    return {
      status: 200,
      json: {
        data: data,
        info: { type: 'success', message: message || '' },
      },
    };
  }
}

export const SuccessResponse = <T extends object | null>(
  data: T | null,
  response: ApiResponse<T | null>,
  message?: string
) => {
  const { status, json } = new ResponseException(
    ResponseException.createSuccessObject(data, message)
  );

  return response.status(status).json(json);
};

export const CatchResponse = <T, R>(
  error: T | null,
  response: ApiResponse<R | null>
): ApiResponse<R | null> => {
  const { status, json } = CatchErrorHandler(error);
  return response.status(status).json(json);
};

export const CatchErrorHandler = <T = any>(
  error: any
): ResponseException<T> => {
  if ('status' in error && 'json' in error) {
    return error;
  }

  console.error(error);

  return new ResponseException<T>(
    ResponseException.createObject<T>(
      500,
      'error',
      'Произошла непредвиденная ошибка'
    )
  );
};
