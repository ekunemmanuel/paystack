import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  customers: defineTable({
    paystackCustomerId: v.string(), // Paystack customer code (CUS_xxx) or ID
    email: v.string(),
    firstName: v.optional(v.union(v.string(), v.null())),
    lastName: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    metadata: v.optional(v.any()),
  })
    .index("by_paystack_customer_id", ["paystackCustomerId"])
    .index("by_email", ["email"]),

  subscriptions: defineTable({
    paystackSubscriptionId: v.string(), // Paystack subscription code (SUB_xxx)
    paystackCustomerId: v.string(),
    planCode: v.string(),
    status: v.string(), // active, non-renewing, attention, completed, cancelled
    amount: v.number(),
    cronExpression: v.optional(v.string()),
    nextPaymentDate: v.optional(v.string()),
    openInvoice: v.optional(v.string()),
    metadata: v.optional(v.any()), // Custom metadata
  })
    .index("by_paystack_subscription_id", ["paystackSubscriptionId"])
    .index("by_paystack_customer_id", ["paystackCustomerId"]),

  payments: defineTable({
    reference: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    email: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    metadata: v.optional(v.any()), // Storing as JSON or Object
    paystackId: v.optional(v.string()),
    paystackCustomerId: v.optional(v.string()), // Link to local customer if available
    channel: v.optional(v.union(v.string(), v.null())),
    paidAt: v.optional(v.union(v.string(), v.null())),
    authorizationUrl: v.optional(v.string()),
    accessCode: v.optional(v.string()),
    plan: v.optional(v.string()),
    updateTime: v.number(),
    statusHistory: v.array(
      v.object({
        status: v.string(),
        timestamp: v.number(),
      }),
    ),
  })
    .index("reference", ["reference"])
    .index("email", ["email"])
    .index("status", ["status"])
    .index("by_paystack_customer_id", ["paystackCustomerId"])
    .index("by_email_amount_status", ["email", "amount", "status"]),
});
