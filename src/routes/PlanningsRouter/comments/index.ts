import express from "express";
import {
	createCommentToEvent,
	getCommentListByEventId,
	removeComment,
	toggleIsImportantComment,
	updateComment
} from "./comments.controller";

const router = express.Router()

// полный путь - /api/planning/events/comments/

router.post('/create', createCommentToEvent)
router.post('/remove', removeComment)
router.post('/update', updateComment)
router.post('/update/isImportant', toggleIsImportantComment)
router.get('/:eventId', getCommentListByEventId)

export const CommentsRouter = router