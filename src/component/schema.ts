import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const payment = v.object({
  reference: v.string(),
  amount: v.number(),
  currency: v.string(),
  status: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  phone: v.optional(v.string()),
  metadata: v.optional(v.string()), // Storing as JSON string
  paystackId: v.optional(v.string()),
});
export default defineSchema({
  payments: defineTable({
    reference: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    metadata: v.optional(v.string()), // Storing as JSON string
    paystackId: v.optional(v.string()),
    updateTime: v.number(),
    statusHistory: v.array(v.object({
      status: v.string(),
      timestamp: v.number(),
    })),
  })
    .index("reference", ["reference"])
    .index("email", ["email"])
    .index("status", ["status"]),
});
