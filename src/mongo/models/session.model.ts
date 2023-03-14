import { model, Schema, Types } from 'mongoose';

const SessionSchema = new Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: Types.ObjectId, required: true, ref: 'User' },
});

SessionSchema.index({ token: 1 }, { expireAfterSeconds: 2592000 });

export const SessionModel = model('Session', SessionSchema);
