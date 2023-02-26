import {EventModelType} from "../../mongo/models/EventModel";
import {Schema} from "mongoose";
import {Comment, CommentModel} from "../../mongo/models/Comment";
import {EventHistory, EventHistoryPopulatedItem} from "../../mongo/models/EventHistory";

export const getChainsCount = (task: EventModelType): number => {
	return (task.parentId ? 1 : 0) + (task.linkedFrom ? 1 : 0)
}

export const getCommentsCount = async (taskId: Schema.Types.ObjectId): Promise<number> => {
	try {
		const comments: Array<CommentModel> | null = await Comment.find({
			eventId: taskId
		})
		
		return comments?.length || 0
	} catch (e) {
		console.error('error in get comments count', e)
		return 0
	}
}

export const getHistoryItemsCount = async (taskId: Schema.Types.ObjectId): Promise<number> => {
	try {
		const historyList: Array<EventHistoryPopulatedItem> | null = await EventHistory.find({
			eventId: taskId
		})
		
		return historyList?.length || 0
	} catch (e) {
		console.error('error in get comments count', e)
		return 0
	}
}

