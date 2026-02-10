import { action, mutation, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { v } from "convex/values";
import { PaystackClient } from "@pablodalpha/paystack";

const paystack = new PaystackClient(components.paystack); 

export const pay = action({
  args: {
    amount: v.number(),
    email: v.string(),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await paystack.createTransaction(ctx, args);
  },
});

export const verifyPayment = action({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    return await paystack.verifyTransaction(ctx, args);
  },
});

export const createOrder = mutation({
  args: {
    amount: v.number(),
    email: v.string(),
    reference: v.string(),
    name: v.string(),
    phone: v.string(),
    metadata: v.any(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    ctx.db.insert("orders", {
      amount: args.amount,
      email: args.email,
      reference: args.reference,
      name: args.name,
      phone: args.phone,
      metadata: args.metadata,
      status: args.status,
      currency: "NGN",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return true;
  },
});