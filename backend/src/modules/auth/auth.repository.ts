import type { ClientSession, HydratedDocument, Types } from "mongoose";

import { SessionModel } from "./session.model.js";
import type { ISession } from "./session.model.js";
import { UserModel } from "./user.model.js";
import type { IUser } from "./user.model.js";

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export const authRepository = {
  async emailExists(email: string): Promise<boolean> {
    const existing = await UserModel.exists({ email });
    return existing !== null;
  },

  async findByEmail(email: string): Promise<HydratedDocument<IUser> | null> {
    return UserModel.findOne({ email });
  },

  async createUser(
    input: CreateUserInput,
    session?: ClientSession,
  ): Promise<HydratedDocument<IUser>> {
    const docs = await UserModel.create([input], session ? { session } : {});
    return docs[0] as HydratedDocument<IUser>;
  },

  async deleteUserById(userId: string): Promise<void> {
    await UserModel.deleteOne({ _id: userId });
  },

  async createSession(input: {
    userId: Types.ObjectId;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<HydratedDocument<ISession>> {
    return SessionModel.create(input);
  },

  async deleteSessionById(sessionId: string): Promise<boolean> {
    const result = await SessionModel.deleteOne({ _id: sessionId });
    return result.deletedCount > 0;
  },

  async findSessionById(
    sessionId: string,
  ): Promise<HydratedDocument<ISession> | null> {
    return SessionModel.findById(sessionId);
  },
};
