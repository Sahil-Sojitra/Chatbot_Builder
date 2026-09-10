import { Schema, Types, model } from "mongoose";

export type OrganizationStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export interface IOrganization {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DEACTIVATED"],
      default: "ACTIVE",
      required: true,
    },

  },
  {
    timestamps: true,
  },
);

export const OrganizationModel = model<IOrganization>(
  "Organization",
  organizationSchema,
);
