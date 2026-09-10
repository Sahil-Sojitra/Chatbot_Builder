import type { HydratedDocument } from "mongoose";

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

  async createUser(input: CreateUserInput): Promise<HydratedDocument<IUser>> {
    return UserModel.create(input);
  },
};
