import {model, Schema} from "mongoose";
import autopopulate from 'mongoose-autopopulate'
import {UserModel} from "./User";
import dayjs from "dayjs";

export type CalendarsModelType = 'Invite' | 'Custom' | 'Main'

export interface CalendarsModel {
	_id: Schema.Types.ObjectId,
	userId: UserModel,
	created: Date,
	isSelected: boolean,
	title: string,
	editable: boolean,
	color: string,
	deletable: boolean,
	type: CalendarsModelType
}

const CalendarsSchema = new Schema({
	userId: {type: Schema.Types.ObjectId, ref: 'User', autopopulate: true},
	created: {type: Date, default: () => dayjs().utc().toDate()},
	isSelected: {type: Boolean, required: true, default: true},
	title: {type: String, required: true},
	editable: {type: Boolean, required: true, default: false},
	color: {type: String, required: true},
	deletable: {type: Boolean, required: true, default: false},
	type: {type: String, default: 'Custom', required: true, of: ['Invite', 'Custom', 'Main']}
})

CalendarsSchema.plugin(autopopulate)

export const Calendars = model<CalendarsModel>('Calendar', CalendarsSchema)
