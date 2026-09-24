import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import schema from "./schema.js";

// ============================================================================
// VALIDATOR HELPERS
// ============================================================================

const customerValidator = schema.tables.customers.validator;
const subscriptionValidator = schema.tables.subscriptions.validator;
const paymentValidator = schema.tables.payments.validator;

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

export const getCustomer = query({
  args: { paystackCustomerId: v.string() },
  returns: v.union(customerValidator, v.null()),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_paystack_customer_id", (q) =>
        q.eq("paystackCustomerId", args.paystackCustomerId),
      )
      .unique();
    if (!customer) return null;
    const { _id, _creationTime, ...data } = customer;
    return data;
  },
});

export const getCustomerByEmail = query({
  args: { email: v.string() },
  returns: v.union(customerValidator, v.null()),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!customer) return null;
    const { _id, _creationTime, ...data } = customer;
    return data;
  },
});

export const getSubscription = query({
  args: { paystackSubscriptionId: v.string() },
  returns: v.union(subscriptionValidator, v.null()),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paystack_subscription_id", (q) =>
        q.eq("paystackSubscriptionId", args.paystackSubscriptionId),
      )
      .unique();
    if (!subscription) return null;
    const { _id, _creationTime, ...data } = subscription;
    return data;
  },
});

export const listSubscriptions = query({
  args: { paystackCustomerId: v.string() },
  returns: v.array(subscriptionValidator),
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_paystack_customer_id", (q) =>
        q.eq("paystackCustomerId", args.paystackCustomerId),
      )
      .collect();
    return subscriptions.map(({ _id, _creationTime, ...data }) => data);
  },
});

export const getPayment = query({
  args: { reference: v.string() },
  returns: v.union(paymentValidator, v.null()),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("reference", (q) => q.eq("reference", args.reference))
      .unique();
    if (!payment) return null;
    const { _id, _creationTime, ...data } = payment;
    return data;
  },
});

export const listPayments = query({
  args: { paystackCustomerId: v.string() },
  returns: v.array(paymentValidator),
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_paystack_customer_id", (q) =>
        q.eq("paystackCustomerId", args.paystackCustomerId),
      )
      .collect();
    return payments.map(({ _id, _creationTime, ...data }) => data);
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

export const createOrUpdateCustomer = mutation({
  args: {
    paystackCustomerId: v.string(),
    email: v.string(),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_paystack_customer_id", (q) =>
        q.eq("paystackCustomerId", args.paystackCustomerId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        metadata: args.metadata,
      });
    } else {
      await ctx.db.insert("customers", {
        paystackCustomerId: args.paystackCustomerId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        metadata: args.metadata,
      });
    }
    return args.paystackCustomerId;
  },
});
