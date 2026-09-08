import { Schema, model } from "mongoose";

export type PlatformRole = "SUPER_ADMIN" | "USER";

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
  lastLoginAt: Date | null;

  profile: {
    avatarUrl?: string;
    timezone?: string;
  };

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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

    lastLoginAt: {
      type: Date,
      default: null,
    },

    profile: {
      avatarUrl: {
        type: String,
      },

      timezone: {
        type: String,
      },

    },

    deletedAt: {
      type: Date,
      default: null,
    },
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