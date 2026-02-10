import { defineSchema, defineTable, } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Any tables used by the example app go here.
  orders: defineTable({
    amount: v.number(),
    currency: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.string(),
    metadata: v.any(),
    status: v.string(),
    reference: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
});
