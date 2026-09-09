import { Schema, model } from "mongoose";
export type UserStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "DEACTIVATED";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  emailVerified: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },


    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DEACTIVATED"],
      default: "ACTIVE",
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
      required: true,
    },

    avatarUrl: {
        type: String,
        default: null,},

  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { email: 1 },
  { unique: true },
);

export const UserModel = model<IUser>("User", userSchema);