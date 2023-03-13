import {EventModel, EventModelType} from "../../../../mongo/models/EventModel";
import {Schema} from "mongoose";
import {ResponseException} from "../../../../exceptions/ResponseException";
import {UserModelResponse} from "../../../../common/transform/session/types";
import {EventHelper} from "../../events/helpers/eventHelper";
import {EventTree} from "./tree.helper";
import * as mongoose from "mongoose";
import {EventTreeModel, EventTreeModelType} from "../../../../mongo/models/EventTree";

type PlaneTree = {
	[key: string]: Array<EventModelType>
}

interface BuildPlaneTreeFnReturned {
	planeTree: PlaneTree,
	trashEvents: Array<EventModelType>
}

export type ProblemEventsSchema = {
	[key: string]: {
		_id: string,
		description: string,
		reqNodeId: string,
	}
}

export class TreeValidator {
	private readonly user: UserModelResponse
	private planeTree: PlaneTree
	
	constructor(user: UserModelResponse) {
		this.user = user
		this.planeTree = {}
	}
	
	static async getTreeIdForUpdate(treeId: Schema.Types.ObjectId | null, user: UserModelResponse): Promise<Schema.Types.ObjectId> {
		if (!treeId) {
			const createdTree: EventTreeModelType | null = await EventTreeModel.create({
				userId: user._id
			})
			
			if (!createdTree) {
				throw new ResponseException(
					ResponseException.createObject(500, 'error', 'Не удалось создать дерево событий')
				)
			}
			
			return createdTree._id
		}
		
		return treeId
	}
	
	private buildPlaneTree(events: Array<EventModelType>): void {
		const planeTree: PlaneTree = {}
		
		events.forEach((item) => {
			if (item.treeId) {
				const treeId = item.treeId.toString()
				
				if (planeTree[treeId]) {
					return planeTree[treeId].push(item)
				}
				
				return planeTree[treeId] = [item]
			}
		})
		
		this.planeTree = planeTree
	}
	
	public async getAllEventsForUpdate(currentEvent: EventModelType, reqEvents: Array<EventModelType>): Promise<Array<string>> {
		const {
			trees,
			treesIntersections,
			eventIdsList
		} = this.checkHasIntersections(currentEvent, reqEvents)
		
		const problemEventIds: ProblemEventsSchema = {}
		
		const result: Set<string> = new Set(eventIdsList)
		
		const currentEventParents: Array<string> = await this
			.getEventTree(currentEvent)
			.then((r) => {
				return r?.paths[currentEvent._id.toString()].parentsIds || []
			})
			.catch(() => {
				return []
			})
		
		if (trees.length) {
			const eventApi = new EventHelper(this.user)
			
			const eventsInTrees: Array<EventModelType> | null = await EventModel.find({
				treeId: {$in: trees},
				...eventApi.buildMinimalRootsFilter('owner')
			})
			
			if (!eventsInTrees || !eventsInTrees.length) {
				throw new ResponseException(
					ResponseException.createObject(500, 'error', 'Не удалось получить события из базы данных')
				)
			}
			
			this.buildPlaneTree(eventsInTrees)
			
			for await (let event of reqEvents) {
				if (event.treeId) {
					const eventTreeId = event.treeId.toString()
					const eventsInPlane = this.planeTree[eventTreeId] || []
					const eventId = event._id.toString()
					
					if (!eventsInPlane || !eventsInPlane.length) {
						continue
					}
					
					const {paths} = new EventTree(eventsInPlane)
					const treeNodeEvents = [eventId, ...(paths[eventId].childsIds || [])]
					
					treeNodeEvents.forEach((item) => {
						if (treesIntersections.length && currentEventParents.includes(item)) {
							problemEventIds[item] = {
								reqNodeId: eventId,
								_id: item,
								description: "Добавление этого события вызовет зацикленность дерева событий, так как дочерние события пересекаются с одним из родителей."
							}
						} else {
							eventId !== item && result.add(item)
						}
					})
				}
			}
		}
		
		if (Object.keys(problemEventIds).length) {
			throw new ResponseException(
				ResponseException.createObject(
					400,
					'error',
					'Некоторые добавляемые события не могут быть добавлены в качестве дочерних',
					{problemEventIds}
				)
			)
		}
		
		return Array.from(result)
	}
	
	private async getEventTree(event: EventModelType): Promise<EventTree | null> {
		if (event.treeId) {
			const eventApi = new EventHelper(this.user)
			const eventsInTree: Array<EventModelType> | null = await eventApi.getEventList({
				treeId: event.treeId,
				...eventApi.buildMinimalRootsFilter('owner')
			})
			
			if (!eventsInTree || !eventsInTree.length) {
				throw new ResponseException(
					ResponseException.createObject(500, 'error', 'Не удалось сформировать дерево событий для родителя')
				)
			}
			
			return new EventTree(eventsInTree)
		}
		
		return null
	}
	
	private checkHasIntersections(currentEvent: EventModelType, arr: Array<EventModelType>) {
		const currentEventTreeId = currentEvent.treeId?.toString() || null
		
		let treesIntersections: Array<EventModelType> = []
		let trees: Set<Schema.Types.ObjectId> = new Set()
		let eventIdsList: Array<string> = []
		
		arr.forEach((item) => {
			const itemTreeId = item.treeId?.toString() || null
			
			if (itemTreeId && currentEventTreeId) {
				itemTreeId === currentEventTreeId ? treesIntersections.push(item) : null
			}
			
			if (item.treeId) {
				trees.add(item.treeId)
			}
			
			eventIdsList.push(item._id.toString())
		})
		
		return {
			treesIntersections,
			currentEventTreeId,
			trees: trees.size ? Array.from(trees) : [],
			eventIdsList
		}
	}
	
	
}