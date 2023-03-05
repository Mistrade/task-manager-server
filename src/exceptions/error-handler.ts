export class ApiErrorHandler extends Error {
	status: number;
	errors: Array<string>;
	
	constructor(status: number, message: string, errors: Array<string> = []) {
		super(message);
		this.status = status;
		this.errors = errors;
	}
	
	static UnauthorizedError() {
		return new ApiErrorHandler(403, 'Для доступа к данному ресурсу пользователь должен быть авторизован')
	}
	
	static BadRequest(message: string, errors: Array<string> = []) {
		return new ApiErrorHandler(400, message, errors)
	}
	
}