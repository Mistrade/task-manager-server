import { Schema, Types } from 'mongoose';

interface VoteModelProps {
  _id: Types.ObjectId; //Ид
  title: string; // Заголовок
  isAnonymousVote: boolean; //Анонимное голосование
  hint?: string; //Подсказка
  autoOpenHint?: boolean;
  owner: Types.ObjectId; //Владелец голосования
  listType: 'ul' | 'ol';
  elements: Array<{
    _id: Types.ObjectId;
    title: string;
    votes: Array<{
      user: Types.ObjectId;
      result: VOTE_TYPE;
    }>;
  }>;
}

enum VOTE_LIST_TYPES {
  'NUMERIC' = 'ol',
  'NON_NUMERIC' = 'ul',
}

enum VOTE_TYPE {
  'LIKE' = 'like',
  'DISLIKE' = 'dislike',
}

const VoteElementSchema = new Schema({
  title: { type: String, required: true },
  votes: {
    type: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'User',
        },
        result: { type: String, required: true },
      },
    ],
  },
});

const VoteSchema = new Schema({
  title: { type: String, required: true },
  isAnonymousVote: { type: Boolean, default: false },
  hint: { type: String, default: null },
  autoOpenHint: { type: Boolean, default: false },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  listType: { type: String, default: VOTE_LIST_TYPES.NON_NUMERIC },
  elements: {
    type: [VoteElementSchema],
    default: [],
  },
});
