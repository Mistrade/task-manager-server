import {CommentsControllerObject} from "./types";
import {CatchErrorHandler, ResponseException} from "../../../exceptions/ResponseException";
import {CommentsHelper} from "./helpers/comments.helper";
import {UpdateCommentHelper} from "./helpers/update-comment.helper";

export const createCommentToEvent: CommentsControllerObject['createCommentToEvent'] = async (request, response) => {
	try {
		const {user, body} = request
		
		const commentApi = new CommentsHelper(user)
		
		await commentApi.createComment(body)
		
		const {json, status} = new ResponseException(
			ResponseException.createSuccessObject(null)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.error(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}

export const removeComment: CommentsControllerObject['removeComment'] = async (request, response) => {
	try {
		const {user, body} = request
		
		const commentApi = new CommentsHelper(user)
		
		await commentApi.removeComment(body.commentId)
		
		const {json, status} = new ResponseException(
			ResponseException.createSuccessObject(null)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.error(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}

export const getCommentListByEventId: CommentsControllerObject['getCommentListByEventId'] = async (request, response) => {
	try {
		const {user, params: {eventId}} = request
		
		const commentApi = new CommentsHelper(user)
		
		const result = await commentApi.getBuildCommentsList(eventId)
		
		const {json, status} = new ResponseException(
			ResponseException.createSuccessObject(result)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.error(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}

export const toggleIsImportantComment: CommentsControllerObject['toggleIsLikedComment'] = async (request, response) => {
	try {
		const {user, body} = request
		
		const commentUpdateApi = new UpdateCommentHelper(user)
		
		await commentUpdateApi.updateCommentInfo(body)
		
		const {status, json} = new ResponseException(
			ResponseException.createSuccessObject(null)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.error(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}

export const updateComment: CommentsControllerObject['updateComment'] = async (request, response) => {
	try {
		const {user, body} = request
		
		const commentUpdApi = new UpdateCommentHelper(user)
		
		await commentUpdApi.updateCommentInfo(body)
		
		const {status, json} = new ResponseException(
			ResponseException.createSuccessObject(null)
		)
		
		return response.status(status).json(json)
	} catch (e) {
		console.error(`error in ${request.originalUrl}: `, e)
		const {status, json} = CatchErrorHandler(e)
		return response.status(status).json(json)
	}
}