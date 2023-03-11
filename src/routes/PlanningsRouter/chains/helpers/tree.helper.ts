import {EventModelType} from "../../../../mongo/models/EventModel";
import {Schema} from "mongoose";

interface EventTreeItem {
	_id: Schema.Types.ObjectId,
	child: Array<EventTreeItem>
}


interface NodeType<EventType = EventModelType> {
	_id: string,
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

export class EventTree<InitialEventType extends ExtendableEventType = EventModelType> {
	public eventTree: NodeType<InitialEventType> | null
	
	constructor(arr: Array<InitialEventType>) {
		this.eventTree = this.generateEventTree(arr)
	}
	
	private mergeChildren<EventType = EventModelType>(
		children: BeforeMergedChildrenArray<EventType>,
		store: BeforeMergeObject<EventType>
	): Array<NodeType<EventType>> {
		return children.map((item) => {
			const childrenItem: BeforeMergedChildrenArray<EventType> = store[item._id]
			
			return {
				_id: item._id,
				event: item.event,
				child: this.mergeChildren(childrenItem, store)
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
		
		const rootChildren = obj[root]
		
		const result: NodeType<EventType> = {
			_id: root,
			event: root,
			child: this.mergeChildren(rootChildren, obj)
		}
		
		return result
	}
}