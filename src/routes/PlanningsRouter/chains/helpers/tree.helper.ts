import {EventModelType} from "../../../../mongo/models/EventModel";
import {Schema} from "mongoose";
import {ResponseException} from "../../../../exceptions/ResponseException";

interface NodeType<EventType = EventModelType> {
	_id: string,
	_parentId: string | null,
	event: EventType,
	child: Array<NodeType<EventType>>,
	
}

interface BeforeMergeArrayItem<EventType = EventModelType> {
	_id: string,
	event: EventType,
}

type BeforeMergedChildrenArray<EventType = EventModelType> = Array<BeforeMergeArrayItem<EventType>>

interface BeforeMergeObject<EventType = EventModelType> {
	[key: string]: BeforeMergedChildrenArray<EventType>
}

type ExtendableEventType = Pick<EventModelType, '_id' | "parentId">

interface CanImPushChildEventOptions {
	childEventId: Array<Schema.Types.ObjectId>,
	parentEventId: Schema.Types.ObjectId,
}

interface CanImPushError {
	forbiddenId: Array<Schema.Types.ObjectId>,
	message: string
}

interface CanImPushChildEventFnReturned<State extends boolean = boolean> {
	state: State,
	error?: CanImPushError
}

type PathsObj<EventType> = { [key: string]: { parents: Array<string>, childs: Array<string> } }

export class EventTree<InitialEventType extends ExtendableEventType = EventModelType> {
	public eventTree: NodeType<InitialEventType> | null
	public paths: PathsObj<InitialEventType> = {}
	
	constructor(arr: Array<InitialEventType>) {
		this.eventTree = this.generateEventTree(arr)
	}
	
	private mergeChildren<EventType = EventModelType>(
		_parentId: string | null,
		children: BeforeMergedChildrenArray<EventType>,
		store: BeforeMergeObject<EventType>,
		prevPath: Array<string>
	): Array<NodeType<EventType>> {
		const path = [...prevPath]
		
		return children.map((item) => {
			const childrenItem: BeforeMergedChildrenArray<EventType> = store[item._id]
			
			this.paths[item._id] = {
				parents: path,
				childs: []
			}
			
			path.forEach((parentPath) => {
				this.paths[parentPath].childs.push(item._id)
			})
			
			return {
				_parentId,
				_id: item._id,
				event: item.event,
				path,
				child: this.mergeChildren(item._id, childrenItem || [], store, [...path, item._id])
			}
		})
	}
	
	private generateEventTree<EventType extends ExtendableEventType = EventModelType>(
		arr: Array<EventType>
	): NodeType<EventType> | null {
		if (!arr || !arr.length) {
			return null
		}
		
		const obj: BeforeMergeObject<EventType> = {}
		let root: EventType | null = null
		
		arr.forEach((event) => {
			const eventId = event._id.toString()
			
			if (event.parentId) {
				const pId = event.parentId.toString()
				
				if (!obj[pId]) {
					return obj[pId] = [{
						_id: eventId,
						event
					}]
				}
				
				return obj[pId].push({
					_id: eventId,
					event
				})
			}
			
			return root = event
		})
		
		if (!root) {
			return null
		}
		
		root = root as EventType
		const rootId = root._id.toString()
		const rootChildren = obj[rootId]
		
		this.paths[rootId] = {
			parents: [],
			childs: []
		}
		
		
		return {
			_parentId: null,
			_id: rootId,
			event: root,
			child: this.mergeChildren(rootId, rootChildren || [], obj, [rootId])
		}
	}
}