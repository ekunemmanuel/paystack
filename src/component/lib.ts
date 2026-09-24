import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server.js";

// ============================================================================
// PAYMENTS
// ============================================================================

export const storePayment = internalMutation({
  args: {
    reference: v.string(),
    amount: v.number(),
    currency: v.string(),
    email: v.string(),
    phone: v.optional(v.union(v.string(), v.null())),
    name: v.optional(v.union(v.string(), v.null())),
    metadata: v.optional(v.any()),
    paystackId: v.optional(v.string()),
    paystackCustomerId: v.optional(v.string()),
    channel: v.optional(v.union(v.string(), v.null())),
    paidAt: v.optional(v.union(v.string(), v.null())),
    authorizationUrl: v.optional(v.string()),
    accessCode: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  returns: v.id("payments"),
  handler: async (ctx, args) => {
    // Race-condition check: if another identical request inserted while we were calling Paystack
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_email_amount_status", (q) =>
        q
          .eq("email", args.email)
          .eq("amount", args.amount)
          .eq("status", "pending"),
      )
      .filter((q) => q.gt(q.field("updateTime"), Date.now() - 10 * 60 * 1000))
      .unique();

    if (existing) {
      // If a payment already exists with the same session info, return it instead of inserting
      if (args.authorizationUrl && args.accessCode) {
        return existing._id;
      }
    }

    // Try to link to a customer if paystackCustomerId or email is present
    let finalPaystackCustomerId = args.paystackCustomerId;
    if (!finalPaystackCustomerId) {
      const customer = await ctx.db
        .query("customers")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .unique();
      if (customer) {
        finalPaystackCustomerId = customer.paystackCustomerId;
      }
    }

    return await ctx.db.insert("payments", {
      ...args,
      paystackCustomerId: finalPaystackCustomerId,
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

export const getRecentPayment = internalQuery({
  args: {
    email: v.string(),
    amount: v.number(),
    currency: v.string(),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find a pending payment in the last 10 minutes
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    return await ctx.db
      .query("payments")
      .withIndex("by_email_amount_status", (q) =>
        q
          .eq("email", args.email)
          .eq("amount", args.amount)
          .eq("status", "pending"),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("currency"), args.currency),
          q.eq(q.field("plan"), args.plan),
          q.gt(q.field("updateTime"), tenMinutesAgo),
        ),
      )
      .first();
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
      name: v.optional(v.union(v.string(), v.null())),
      phone: v.optional(v.union(v.string(), v.null())),
      metadata: v.optional(v.any()),
      paystackId: v.optional(v.string()),
      paystackCustomerId: v.optional(v.string()),
      channel: v.optional(v.union(v.string(), v.null())),
      paidAt: v.optional(v.union(v.string(), v.null())),
      authorizationUrl: v.optional(v.string()),
      accessCode: v.optional(v.string()),
      updateTime: v.number(),
      statusHistory: v.array(
        v.object({
          status: v.string(),
          timestamp: v.number(),
        }),
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
    metadata: v.optional(v.any()),
    paystackId: v.optional(v.string()),
    channel: v.optional(v.string()),
    paidAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const statusHistory = payment.statusHistory ?? [];
    const hasStatusChanged = args.status !== payment.status;

    if (hasStatusChanged) {
      statusHistory.push({
        status: args.status,
        timestamp: Date.now(),
      });
    }

    const patch: any = {
      updateTime: Date.now(),
    };
    if (hasStatusChanged) {
      patch.status = args.status;
      patch.statusHistory = statusHistory;
    }
    if (args.metadata !== undefined) patch.metadata = args.metadata;
    if (args.paystackId) patch.paystackId = args.paystackId;
    if (args.channel) patch.channel = args.channel;
    if (args.paidAt) patch.paidAt = args.paidAt;

    await ctx.db.patch(args.paymentId, patch);
  },
});

// ============================================================================
// CUSTOMERS
// ============================================================================

export const upsertCustomer = internalMutation({
  args: {
    paystackCustomerId: v.string(),
    email: v.string(),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_paystack_customer_id", (q) =>
        q.eq("paystackCustomerId", args.paystackCustomerId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("customers", args);
    }
  },
});

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const upsertSubscription = internalMutation({
  args: {
    paystackSubscriptionId: v.string(),
    paystackCustomerId: v.string(),
    planCode: v.string(),
    status: v.string(),
    amount: v.number(),
    cronExpression: v.optional(v.string()),
    nextPaymentDate: v.optional(v.string()),
    openInvoice: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_paystack_subscription_id", (q) =>
        q.eq("paystackSubscriptionId", args.paystackSubscriptionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("subscriptions", args);
    }
  },
});
