import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server.js";

export const storePayment = internalMutation({
  args: {
    reference: v.string(),
    amount: v.number(),
    currency: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    metadata: v.optional(v.string()),
    paystackId: v.optional(v.string()),
  },
  returns: v.id("payments"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      ...args,
      updateTime: Date.now(),
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          timestamp: Date.now(),
        },
      ],
    });
  },
});

export const getPayment = internalQuery({
  args: { reference: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("payments"),
      _creationTime: v.number(),
      amount: v.number(),
      currency: v.string(),
      email: v.string(),
      status: v.string(),
      reference: v.string(),
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      metadata: v.optional(v.string()),
      paystackId: v.optional(v.string()),
      updateTime: v.optional(v.number()),
      statusHistory: v.optional(
        v.array(
          v.object({
            status: v.string(),
            timestamp: v.number(),
          }),
        ),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("reference", (q) => q.eq("reference", args.reference))
      .unique();
  },
});

export const updatePaymentStatus = internalMutation({
  args: {
    paymentId: v.id("payments"),
    status: v.string(),
    metadata: v.optional(v.string()),
    paystackId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const statusHistory = payment.statusHistory ?? [];
    statusHistory.push({
      status: args.status,
      timestamp: Date.now(),
    });

    const patch: any = {
      status: args.status,
      updateTime: Date.now(),
      statusHistory,
    };
    if (args.metadata) patch.metadata = args.metadata;
    if (args.paystackId) patch.paystackId = args.paystackId;

    await ctx.db.patch(args.paymentId, patch);
  },
});
