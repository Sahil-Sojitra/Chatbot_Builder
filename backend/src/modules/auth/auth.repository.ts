import type { ClientSession, HydratedDocument } from "mongoose";

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

  async findUserById(userId: string): Promise<HydratedDocument<IUser> | null> {
    return UserModel.findById(userId);
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
};
