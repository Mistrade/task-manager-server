import * as mongoose from 'mongoose';
import { HydratedDocument, Schema } from 'mongoose';
import dayjs from 'dayjs';
import {
  EventLinkItem,
  LinkSchema,
  PriorityKeys,
  TaskStatusesType,
} from './event.model';
import { UserModelHelper } from '../helpers/user.helper';
import autopopulate from 'mongoose-autopopulate';
import { DbTaskPriorities, DbTaskStatuses } from '../../common/constants';
import { GroupsModelResponse, GroupsModelType } from './groups.model';
import { utcDate } from '../../common/common';
import { UserModelResponse } from '../../routes/public/session/types';

//Интерфейс объекта, предназначенного для записи объекта истории в базу, включающий только обязательные поля схемы
export interface CreateSnapshotDefaultFields {
  _id: Schema.Types.ObjectId;
  createdAt: Date;
  user: Schema.Types.ObjectId;
  originalEventId: Schema.Types.ObjectId;
  title: string;
  priority: PriorityKeys;
  status: TaskStatusesType;
}

//Интерфейс объекта, предназначенного для записи объекта истории в базу, включающий только необязательные поля схемы
export interface EventSnapshotCreateOptionalType {
  checkList?: string | null; //Название чек-листа
  group?: Schema.Types.ObjectId | null;
  description?: string;
  insertChildOfEvents?: Array<EventHistoryRequiredFields>;
  removeChildOfEvents?: Array<EventHistoryRequiredFields>;
  sendInvites?: Array<Schema.Types.ObjectId>;
  closeInvites?: Array<Schema.Types.ObjectId>;
  link?: EventLinkItem | null;
  parentEvent?: EventHistoryRequiredFields | null;
  linkedFrom?: EventHistoryRequiredFields | null;
  time?: Date | null;
  timeEnd?: Date | null;
  type?: string | null;
  isLiked?: boolean | null;
}

//Итоговый интерфейс объекта, который должен быть записан в базу истории
interface EventSnapshotCreatedFullType
  extends EventSnapshotCreateOptionalType,
    CreateSnapshotDefaultFields {}

//Поля объекта истории, который обновлять не нужно
export type ExcludeEventHistoryFieldNames = '_id';

//Обязательные ключи для заполнения
export type EventHistoryRequiredFields = Omit<
  CreateSnapshotDefaultFields,
  '_id'
>;

//Поля объекта истории, по которым могут быть внесены записи об обновлении
export type EventHistoryEditableFieldNames = keyof Omit<
  EventSnapshotCreatedFullType,
  ExcludeEventHistoryFieldNames
>;

//Слияние типов обязательных ключей для записи в хранилище истории и необязательного ключа по входному FieldName
export type EventHistorySnapshot<
  FieldName extends EventHistoryEditableFieldNames = any
> =
  //Обязательный тип из полного объекта snapshot по ключу FieldName
  Required<Pick<EventSnapshotCreatedFullType, FieldName>> &
    //И все обязательные ключи объекта Snapshot
    Omit<CreateSnapshotDefaultFields, ExcludeEventHistoryFieldNames> &
    //И все необязательные ключи
    Omit<EventSnapshotCreateOptionalType, FieldName>;

//Интерфейс данных на запись объекта истории
export interface EventHistoryCreateType<
  Key extends EventHistoryEditableFieldNames = any
> {
  //Дата на момент записи в utc часовом поясе
  date: Date;
  //Имя ключа, который был отредактирован
  fieldName: Key;
  //Id пользователя, вносившего изменения
  changeUserId: Schema.Types.ObjectId;
  //Id события, за которым будет закреплен объект истории
  eventId: Schema.Types.ObjectId;
  //Описание изменений
  snapshotDescription: string;
  //Скриншот события, после внесения обновлений
  eventSnapshot: EventHistorySnapshot<Key>;
  //Если передать isPrivate = true, то эта запись будет отображаться только у создателя historyItem
  isPrivate?: boolean;
}

//Список обновляемых полей события для истории
type Fields = EventHistoryEditableFieldNames;

//Объект с ключами (обновляемые поля события) и значением, которое должно быть записано в историю
export type EventHistoryEditableFieldsMap<FieldName extends Fields> = {
  [PROP in FieldName]: Omit<
    EventHistoryCreateType<PROP>,
    'changeUserId' | 'date'
  >;
};

//Массив объектов, передаваемый в метод HistoryHelper.addToHistory
export type EventHistoryArrayToCreate<FieldNames extends Fields> = Array<
  EventHistoryEditableFieldsMap<FieldNames>[FieldNames]
>;

//Интерфейс объекта истории, который возвращается из базы с заполнением полей, содержащий только обязательные поля
export interface QuerySnapshotRequiredFields {
  //id записи
  _id: Schema.Types.ObjectId;
  //Когда событие было создано
  createdAt: Date;
  //Кто создал событие
  user: UserModelResponse | null;
  //id актуального события
  originalEventId: Schema.Types.ObjectId | null;
  //Заголовок или название
  title: string;
  //Приоритет события
  priority: PriorityKeys;
  //Статус события
  status: TaskStatusesType;
}

//Интерфейс объекта истории, который возвращается из базы с заполнением полей, содержащий только необязательные поля
export interface QuerySnapshotOptionalFields {
  //Календарь, за которым закреплено событие
  group?: GroupsModelType | null;
  //Описание
  description?: string;
  //Список событий, которые были добавлены как дочерние
  insertChildOfEvents?: Array<QuerySnapshotRequiredFields | null>;
  //Список событий, которые были удалены из дочерних
  removeChildOfEvents?: Array<QuerySnapshotRequiredFields | null>;
  //Список пользователей, добавленных к событию
  sendInvites?: Array<UserModelResponse | null>;
  //Список пользователей, которые были удалены из события
  closeInvites?: Array<UserModelResponse | null>;
  //Ссылка события
  link?: EventLinkItem | null;
  //Родительское событие
  parentEvent?: QuerySnapshotRequiredFields | null;
  //Событие, от которого производилось клонирование
  linkedFrom?: QuerySnapshotRequiredFields | null;
  //Время начала события
  time?: Date | null;
  //Время завершения события
  timeEnd?: Date | null;
  //Тип события (пока не актуально)
  type?: string | null;
  //Избранное событие или нет
  isLiked?: boolean;
}

//Возвращаемый тип данных объекта snapshot из запроса в БД истории
export type EventHistoryQuerySnapshot = QuerySnapshotRequiredFields &
  QuerySnapshotOptionalFields;

//Интерфейс объекта истории, который возвращается из базы с заполнением полей
export interface EventHistoryQueryResult {
  //Дата когда была произведена запись в историю
  date: Date;
  //Имя ключа из snapshot, которое было изменено
  fieldName: EventHistoryEditableFieldNames;
  //Юзер, который производил изменения
  changeUserId: UserModelResponse | null;
  //Id, за которым закреплена запись истории
  eventId: Schema.Types.ObjectId | null;
  //Описание записи истории
  snapshotDescription: string;
  //Скриншот события для истории
  eventSnapshot: EventHistoryQuerySnapshot;
  //Если isPrivate = true, то эта запись истории будет отображаться только у создателя historyItem
  isPrivate: boolean;
}

const SnapshotRequiredSchema = new Schema({
  createdAt: { type: Date, default: () => utcDate(), required: true },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    autopopulate: {
      select: [
        'name',
        'surname',
        'phone',
        '_id',
        'email',
        'patronymic',
        'created',
      ],
    },
    required: true,
  },
  originalEventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    get(value: Schema.Types.ObjectId | null): Schema.Types.ObjectId | null {
      if (!value) return null;
      return value;
    },
  },
  title: { type: String, required: true },
  priority: { type: String, of: DbTaskPriorities, required: true },
  status: { type: String, of: DbTaskStatuses, required: true },
});

SnapshotRequiredSchema.plugin(autopopulate);

const EventSnapshotSchema = new Schema().add(SnapshotRequiredSchema).add({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    autopopulate: true,
    get(
      value: HydratedDocument<GroupsModelType> | null
    ): GroupsModelResponse | null {
      if (!value || !value?._id) {
        return null;
      }
      return {
        ...value.toObject(),
        userId: UserModelHelper.getPopulatedUserWithoutPassword(value.userId),
      };
    },
  },
  description: { type: String, default: '' },
  insertChildOfEvents: {
    type: [SnapshotRequiredSchema],
    default: [],
    get: function (value: Array<QuerySnapshotRequiredFields>) {
      if (!value || !Array.isArray(value)) {
        return [];
      }
      return value;
    },
  },
  removeChildOfEvents: {
    type: [SnapshotRequiredSchema],
    default: [],
    get(value: Array<QuerySnapshotRequiredFields>) {
      if (!value || !Array.isArray(value)) {
        return [];
      }
      return value;
    },
  },
  sendInvites: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        autopopulate: {
          select: [
            'name',
            'surname',
            'phone',
            '_id',
            'email',
            'patronymic',
            'created',
          ],
        },
      },
    ],
    default: [],
  },
  closeInvites: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        autopopulate: {
          select: [
            'name',
            'surname',
            'phone',
            '_id',
            'email',
            'patronymic',
            'created',
          ],
        },
      },
    ],
    default: [],
  },
  link: { type: LinkSchema, default: null },
  parentEvent: {
    type: SnapshotRequiredSchema,
    default: null,
  },
  linkedFrom: {
    type: SnapshotRequiredSchema,
    default: null,
  },
  time: Date,
  timeEnd: Date,
  type: String,
  isLiked: { type: Boolean, default: false },
});

EventSnapshotSchema.plugin(autopopulate);

const EventHistorySchema = new Schema({
  date: { type: Date, required: true, default: () => dayjs().utc().toDate() },
  fieldName: { type: String, required: true },
  changeUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    autopopulate: {
      select: [
        'name',
        'surname',
        'phone',
        '_id',
        'email',
        'patronymic',
        'created',
      ],
    },
  },
  eventId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Event',
    get(v: Schema.Types.ObjectId | null): Schema.Types.ObjectId | null {
      return !v ? null : v;
    },
  },
  snapshotDescription: { type: String, required: true },
  eventSnapshot: { type: EventSnapshotSchema, required: true },
  isPrivate: { type: Boolean, default: false },
});

EventHistorySchema.plugin(autopopulate);

export const EventHistoryModel = mongoose.model(
  'EventHistory',
  EventHistorySchema
);
