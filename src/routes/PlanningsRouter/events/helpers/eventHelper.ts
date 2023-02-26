import {EventModel, EventModelType} from "../../../../mongo/models/EventModel";
import {HydratedDocument, InferSchemaType, QueryOptions} from "mongoose";
import {SessionHandler} from "../../../SessionRouter/SessionHandler";
import {CatchErrorHandler, ResponseException} from "../../../../exceptions/ResponseException";
import {UserModelResponse} from "../../../../common/transform/session/types";
import {objectIdInArrayOfAnotherObjectId, objectIdIsEquals} from "../../../../common/common";
import {EventModelFilters} from "../../index";

export class EventHelper<EventType extends EventModelType = EventModelType> {
	public user: UserModelResponse
	
	constructor(user?: UserModelResponse) {
		this.user = new SessionHandler(user).checkUser()
	}
	
	public isCreator(event: EventType): { result: boolean } & EventHelper<EventType> {
		return {
			...this,
			result: objectIdIsEquals(event.userId._id, this.user._id)
		}
	}
	
	public isMember(event: EventType): { result: boolean } & EventHelper<EventType> {
		return {
			...this,
			result: objectIdInArrayOfAnotherObjectId(this.user._id, event.members || [])
		}
	}
	
	public isCreatorOrMember(event: EventType): { result: boolean } & EventHelper<EventType> {
		return {
			...this,
			result: this.isCreator(event).result || this.isMember(event).result
		}
	}
	
	public async getEvent(filters: EventModelFilters): Promise<ResponseException<HydratedDocument<EventType>> & EventHelper<EventType>> {
		try {
			const event: HydratedDocument<EventType> | null = await EventModel.findOne(filters)
			
			if (event) {
				return {
					...this,
					...ResponseException.createSuccessObject(event)
				}
			}
			
			throw new ResponseException(ResponseException.createObject(404, "error", "Событие не найдено"))
		} catch (e) {
			return {
				...this,
				...CatchErrorHandler(e)
			}
		}
	}
	
	public async getEventWithCheckRoots(
		filters: EventModelFilters
	): Promise<ResponseException<HydratedDocument<EventType>> & EventHelper<EventType>> {
		try {
			return this.getEvent({
				...filters,
				$or: [
					{userId: this.user._id},
					{members: this.user._id}
				]
			})
		} catch (e) {
			console.error('error in get event with check user roots: ', e)
			return {
				...this,
				...CatchErrorHandler(e)
			}
		}
	}
	
	public async findAndUpdateEvent(
		filters: EventModelFilters,
		query: EventModelFilters,
		options?: QueryOptions<InferSchemaType<EventType>>
	): Promise<ResponseException<EventType> & EventHelper<EventType>> {
		try {
			const prevEvent: EventModelType | null = await EventModel.findOneAndUpdate(filters, query, options || {})
			
			if (!prevEvent) {
				throw new ResponseException(
					ResponseException.createObject(404, "error", "Не удалось обновить событие")
				)
			}
			
			return await this.getEvent({_id: prevEvent._id})
			
		} catch (e) {
			console.error('error in update event handler', e)
			return {
				...this,
				...CatchErrorHandler<EventType>(e)
			}
		}
	}
}