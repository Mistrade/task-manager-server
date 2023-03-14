import { SessionController } from '../../../session/session.controller';
import {
  CommentModel,
  CommentModelType,
} from '../../../../../mongo/models/comment.model';
import { objectIdIsEquals } from '../../../../../common/common';
import {
  EventModel,
  EventModelType,
} from '../../../../../mongo/models/event.model';
import { HydratedDocument, Schema } from 'mongoose';
import {
  CommentResponseModel,
  CreateCommentProps,
  GetCommentByEventIdReturned,
} from '../types';
import { EventHelper } from '../../events/helpers/event.helper';
import { ResponseException } from '../../../../../exceptions/response.exception';
import { DefaultEventItemResponse } from '../../info/types';
import { UserModelResponse } from '../../../session/types';

export class CommentsHelper {
  public user: UserModelResponse;

  constructor(user?: UserModelResponse) {
    const checkedUser = new SessionController(user).checkUser();
    this.user = checkedUser;
  }

  private validateMessage(message: string) {
    const length = message.length;
    return length > 0 && length < 3000;
  }

  private buildCommentItem(
    comment: CommentModelType,
    buildEvent: DefaultEventItemResponse
  ): CommentResponseModel {
    const isCommentCreator = objectIdIsEquals(
      comment.userId._id,
      this.user._id
    );
    const isImportant = !!(comment.likedUsers || []).find((_id) =>
      objectIdIsEquals(_id, this.user._id)
    );

    return {
      date: comment.date,
      deletable:
        buildEvent.accessRights === 'owner' || isCommentCreator || false,
      editable: isCommentCreator,
      isImportant,
      eventId: comment._id,
      userId: comment.userId,
      message: comment.message,
      sourceComment: comment.sourceComment,
      _id: comment._id,
      updatedAt: comment.updatedAt,
    };
  }

  private canIDelete(
    comment: CommentModelType,
    eventCreator: Schema.Types.ObjectId
  ) {
    const isEventCreator = objectIdIsEquals(eventCreator, this.user._id);
    const isCommentCreator = objectIdIsEquals(
      comment.userId._id,
      this.user._id
    );

    return isEventCreator || isCommentCreator;
  }

  public async getCommentById(
    id: Schema.Types.ObjectId,
    throwMessage?: string
  ): Promise<HydratedDocument<CommentModelType>> {
    const comment = await CommentModel.findOne({
      _id: id,
    });

    if (!comment) {
      throw new ResponseException(
        ResponseException.createObject(
          404,
          'error',
          throwMessage || 'Комментарий не найден'
        )
      );
    }

    return comment;
  }

  public async createComment(
    data: CreateCommentProps
  ): Promise<HydratedDocument<CommentModelType>> {
    const { message, sourceCommentId, eventId } = data;

    const v = this.validateMessage(message);

    if (!v) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'warning',
          `Комментарий может быть 0 до 3000 символов`
        )
      );
    }

    const eventApi = new EventHelper(this.user);

    const event: HydratedDocument<EventModelType> | null =
      await eventApi.getEvent({ _id: eventId });

    if (!event) {
      throw new ResponseException(
        ResponseException.createObject(404, 'error', 'Не удалось найти событие')
      );
    }

    eventApi.checkUserRootsAndBuild(
      event,
      'editor',
      'none',
      'Недостаточно прав доступа для комментирования этого события'
    );

    let sourceComment: HydratedDocument<CommentModelType> | null = null;

    if (sourceCommentId) {
      sourceComment = await this.getCommentById(
        sourceCommentId,
        'Не удалось найти комментарий, на который был написан ответ'
      );
    }

    const createdComment: HydratedDocument<CommentModelType> | null =
      await CommentModel.create({
        eventId: event._id,
        userId: this.user._id,
        sourceComment: sourceComment?.id || null,
        message,
      });

    if (!createdComment) {
      throw new ResponseException(
        ResponseException.createObject(
          500,
          'error',
          'Не удалось создать комментарий'
        )
      );
    }

    return createdComment;
  }

  public async removeComment(commentId?: Schema.Types.ObjectId) {
    if (!commentId) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'На вход ожидался идентификатор комментария'
        )
      );
    }

    const comment = await this.getCommentById(
      commentId,
      'Комментарий не найден'
    );

    const eventApi = new EventHelper(this.user);

    const event: HydratedDocument<EventModelType> | null =
      await eventApi.getEventWithCheckRoots({ _id: comment.eventId });

    if (!event) {
      throw new ResponseException(
        ResponseException.createObject(404, 'error', 'Событие не найдено')
      );
    }

    eventApi.checkUserRootsAndBuild(
      event,
      'editor',
      'response-item',
      'Недостаточно прав доступа для удаления этого комментария'
    );

    const deletable = this.canIDelete(comment, event.userId._id);

    if (!deletable) {
      throw new ResponseException(
        ResponseException.createObject(
          403,
          'error',
          'Вы не можете удалить этот комментарий'
        )
      );
    }

    await CommentModel.deleteOne({
      eventId: event.id,
      _id: commentId,
    });
  }

  public async getCommentsByEventId(
    eventId: Schema.Types.ObjectId
  ): Promise<GetCommentByEventIdReturned> {
    if (!eventId) {
      throw new ResponseException(
        ResponseException.createObject(
          400,
          'error',
          'На вход ожидался id события'
        )
      );
    }

    const eventApi = new EventHelper(this.user);

    const event = await eventApi.getEvent({ _id: eventId });

    const buildEvent = eventApi.checkUserRootsAndBuild(
      event,
      'viewer',
      'response-item',
      'Недостаточно прав доступа для просмотра комментариев этого события'
    );

    const comments: Array<HydratedDocument<CommentModelType>> | null =
      await CommentModel.find({ eventId }, {}, { sort: { date: -1 } });

    if (!comments) {
      throw new ResponseException(
        ResponseException.createObject(404, 'error', 'Комментарии не найдены')
      );
    }

    return {
      comments,
      buildEvent,
    };
  }

  public async getBuildCommentsList(
    eventId: Schema.Types.ObjectId
  ): Promise<Array<CommentResponseModel>> {
    const { comments, buildEvent } = await this.getCommentsByEventId(eventId);

    return comments.map((item) => this.buildCommentItem(item, buildEvent));
  }

  public async removeCommentsByEventId(
    eventId: Schema.Types.ObjectId | Array<Schema.Types.ObjectId>,
    disableCheckRoots: boolean = false
  ): Promise<boolean> {
    if (!eventId || (Array.isArray(eventId) && eventId?.length === 0)) {
      console.log('cекция 1');
      return false;
    }

    let resultEventId = eventId;

    if (!disableCheckRoots) {
      const eventApi = new EventHelper(this.user);
      const rootsFilter = eventApi.buildMinimalRootsFilter('owner');
      const eventList: Array<HydratedDocument<EventModelType>> | null =
        await EventModel.find({
          _id: Array.isArray(eventId) ? { $in: eventId } : eventId,
          ...rootsFilter,
        });

      if (!eventList || !eventList.length) {
        console.log('секция 2');
        return false;
      }

      resultEventId = eventList.map((Item) => Item._id);
    }

    await CommentModel.deleteMany({
      eventId: {
        $in: resultEventId,
      },
    });

    console.log('секция 3: ', JSON.stringify(resultEventId));
    return true;
  }
}
