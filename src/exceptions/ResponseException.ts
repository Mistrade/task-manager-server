import {CustomResponseBody, ErrorTypes, ResponseReturned} from "../EventsRouter/EventsRouter";

export class ResponseException<T extends any = any> {
	public status: number;
	public json: ResponseReturned<CustomResponseBody<T>>['json']
	
	constructor(data: ResponseReturned<CustomResponseBody<T>>) {
		this.status = data.status;
		this.json = data.json
	}
	
	public static createObject<T extends any = any>(status: number, type: ErrorTypes, message: string): ResponseException<T> {
		return {
			status,
			json: {
				data: null,
				info: {type, message}
			}
		}
	}
	
	public static createSuccessObject<T extends any = any>(data: T): ResponseException<T> {
		return {
			status: 200,
			json: {
				data,
				info: {type: "success", message: ""}
			}
		}
	}
}

export const CatchErrorHandler = <T extends any = any>(error: any): ResponseException<T> => {
	if ("status" in error && "json" in error) {
		return error
	}
	
	console.error(error)
	
	return new ResponseException<T>(
		ResponseException.createObject<T>(500, 'error', "Произошла непредвиденная ошибка")
	)
}