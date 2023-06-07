import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { DB_MODEL_NAMES } from '../helpers/enums';
import { FinanceOperation, IFinanceOperation } from './finance/operation.model';

export enum EVENT_WIDGET_MODEL_MAP {
  'FINANCE' = 'FinanceOperation',
}

export interface IEventFinanceWidget {
  modelName: EVENT_WIDGET_MODEL_MAP.FINANCE;
  model: Types.ObjectId;
  fromEvent: Types.ObjectId;
}

export interface IPopulatedEventFinanceWidget {
  modelName: EVENT_WIDGET_MODEL_MAP.FINANCE;
  model: IFinanceOperation | null;
  fromEvent: Types.ObjectId;
}

export type TEventWidgetSources = IEventFinanceWidget;

export type TPopulatedEventWidgetSource = IPopulatedEventFinanceWidget;

export interface IEventWidgetModelBase extends TEventWidgetSources {
  eventId: Types.ObjectId;
  title: string;
  message?: string;
}

export interface IEventWidget extends IEventWidgetModelBase {
  createdAt: Date;
  _id: Types.ObjectId;
}

export interface IPopulatedEventWidget
  extends Omit<IEventWidget, keyof TEventWidgetSources>,
    TPopulatedEventWidgetSource {}

type PreModelType = Model<IEventWidget, object, object>;

interface IEventWidgetStatics {
  findByEventId(
    eventId: Types.ObjectId
  ): Promise<HydratedDocument<IEventWidget> | null>;
}

type TEventWidgetModel = PreModelType & IEventWidgetStatics;

const EventWidgetSchema = new Schema<
  IEventWidget,
  TEventWidgetModel,
  object,
  object,
  object,
  IEventWidgetStatics
>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: DB_MODEL_NAMES.eventModel,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Заголовок виджета не может быть длиннее 200 символов'],
    },
    message: {
      type: String,
      maxlength: [
        1000,
        'Описание виджета должно быть не более 1000 символов в длину',
      ],
    },
    modelName: {
      type: String,
      enum: [EVENT_WIDGET_MODEL_MAP.FINANCE.toString()],
      required: true,
    },
    model: {
      type: Schema.Types.ObjectId,
      required: true,
      // ref: EVENT_WIDGET_MODEL_MAP.FINANCE,
      refPath: 'modelName',
    },
    fromEvent: {
      type: Schema.Types.ObjectId,
      default: null,
      required: [
        true,
        'Источник-событие обязателен для создания виджета события',
      ],
      ref: DB_MODEL_NAMES.eventModel,
    },
  },
  {
    timestamps: { createdAt: true },
    statics: {
      async findByEventId(
        eventId: Types.ObjectId
      ): ReturnType<IEventWidgetStatics['findByEventId']> {
        return EventWidget.findOne({
          eventId,
        }).populate({
          path: 'model',
          model: FinanceOperation,
        });
      },
    },
  }
);

export const EventWidget = model<IEventWidget, TEventWidgetModel>(
  DB_MODEL_NAMES.eventWidget,
  EventWidgetSchema
);
