import express from "express";

interface LogObject {
	logType: 'request' | "response",
	method: string,
	body: any,
	requestURL: string,
	headers: express.Request['headers'],
	protocol: string
}

export function RequestMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
	const logObject: LogObject = {
		requestURL: req.url,
		logType: 'request',
		method: req.method,
		headers: req.headers,
		protocol: req.protocol,
		body: req.body,
	}
	
	next('route')
}
