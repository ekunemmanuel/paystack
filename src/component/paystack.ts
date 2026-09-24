import { action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";

export const createTransaction = action({
  args: {
    amount: v.number(),
    email: v.string(),
    currency: v.optional(v.string()), // Default NGN
    reference: v.optional(v.string()),
    name: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    metadata: v.optional(v.any()), // Allow passing object, will stringify
    callback_url: v.optional(v.string()),
    secretKey: v.optional(v.string()), // Pass in the secret key
    plan: v.optional(v.string()), // Plan code
    channels: v.optional(v.array(v.string())),
  },
  returns: v.object({
    authorization_url: v.string(),
    access_code: v.string(),
    reference: v.string(),
  }),
  handler: async (ctx, args) => {
    // Idempotency: Check if a matching pending transaction already exists (within 10 mins)
    const { lib } = internal as any;
    const existing = await ctx.runQuery(lib.getRecentPayment, {
      email: args.email,
      amount: args.amount,
      currency: args.currency ?? "NGN",
      plan: args.plan,
    });

    if (existing) {
      if (existing.authorizationUrl && existing.accessCode) {
        return {
          authorization_url: existing.authorizationUrl,
          access_code: existing.accessCode,
          reference: existing.reference,
        };
      }
    }

    // Secondary check for specific reference if provided
    if (args.reference) {
      const byRef = await ctx.runQuery(lib.getPayment, {
        reference: args.reference,
      });
      if (byRef) {
        if (byRef.status === "success") {
          throw new ConvexError("Payment already completed for this reference");
        }
        if (byRef.authorizationUrl && byRef.accessCode) {
          return {
            authorization_url: byRef.authorizationUrl,
            access_code: byRef.accessCode,
            reference: byRef.reference,
          };
        }
      }
    }

    const currency = args.currency ?? "NGN";
    const secretKey = args.secretKey;
    if (!secretKey) {
      throw new ConvexError(
        "PAYSTACK_SECRET_KEY is not set. Please set it using: " +
          "npx convex env set PAYSTACK_SECRET_KEY <your-key> --component paystack",
      );
    }

    // Call Paystack API
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: args.amount * 100, // Convert to kobo/cents
          email: args.email,
          currency,
          reference: args.reference,
          callback_url: args.callback_url,
          metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
          plan: args.plan,
          channels: args.channels,
        }),
      },
    );

    const data = await response.json();

    if (!data.status) {
      throw new ConvexError(`Paystack error: ${data.message}`);
    }

    const { authorization_url, access_code, reference } = data.data;

    // Store pending payment
    await ctx.runMutation(internal.lib.storePayment, {
      reference,
      amount: args.amount,
      currency,
      email: args.email,
      name: args.name,
      phone: args.phone,
      metadata: args.metadata,
      authorizationUrl: authorization_url,
      accessCode: access_code,
      plan: args.plan,
    });

    return {
      authorization_url,
      access_code,
      reference,
    };
  },
});

export const verifyTransaction = action({
  args: {
    reference: v.string(),
    secretKey: v.optional(v.string()), // Pass in the secret key
  },
  returns: v.object({
    status: v.string(),
    message: v.string(),
    reference: v.string(),
  }),
  handler: async (ctx, args) => {
    const secretKey = args.secretKey;
    if (!secretKey) {
      throw new Error(
        "PAYSTACK_SECRET_KEY is not set. Please set it using: " +
          "npx convex env set PAYSTACK_SECRET_KEY <your-key> --component paystack",
      );
    }
    // 1. Check if payment exists in our DB
    const payment = await ctx.runQuery(internal.lib.getPayment, {
      reference: args.reference,
    });

    if (!payment) {
      throw new ConvexError("Payment not found in database");
    }

    // 2. Call Paystack Verify API
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${args.reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    const data = await response.json();

    if (!data.status) {
      return {
        status: "failed",
        message: data.message || "Verification failed",
        reference: args.reference,
      };
    }

    const paystackData = data.data;
    const newStatus = paystackData.status;
    console.log("paystackData", paystackData);

    // 3. Update status in DB
    await ctx.runMutation(internal.lib.updatePaymentStatus, {
      paymentId: payment._id,
      status: newStatus,
      metadata: paystackData.metadata,
      paystackId: paystackData.id ? String(paystackData.id) : "",
      channel: paystackData.channel,
      paidAt: paystackData.paid_at ? paystackData.paid_at : undefined,
    });

    return {
      status: newStatus,
      message: data.message,
      reference: args.reference,
    };
  },
});

export const webhookHandler = action({
  args: {
    signature: v.string(),
    body: v.string(),
    secretKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const secret = args.secretKey;
    if (!secret)
      throw new ConvexError("PAYSTACK_SECRET_KEY not set in component env");

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["verify"],
    );

    const signatureBytes = new Uint8Array(
      args.signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(args.body),
    );

    if (!isValid) {
      throw new ConvexError("Invalid webhook signature");
    }

    const event = JSON.parse(args.body);
    const data = event.data;

    switch (event.event) {
      case "charge.success": {
        const { reference, status, metadata, id, customer, channel, paid_at } =
          data;

        const payment = await ctx.runQuery(internal.lib.getPayment, {
          reference,
        });

        if (payment) {
          await ctx.runMutation(internal.lib.updatePaymentStatus, {
            paymentId: payment._id,
            status,
            metadata: metadata, // Only save provided metadata
            paystackId: id ? String(id) : undefined,
            channel,
            paidAt: paid_at,
          });
        }

        // Also update customer if provided
        if (customer) {
          await ctx.runMutation(internal.lib.upsertCustomer, {
            paystackCustomerId: customer.customer_code || String(customer.id),
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name,
            phone: customer.phone,
            metadata: customer.metadata,
          });
        }
        break;
      }
      case "subscription.create":
      case "subscription.disable":
      case "subscription.enable": {
        await ctx.runMutation(internal.lib.upsertSubscription, {
          paystackSubscriptionId: data.subscription_code,
          paystackCustomerId: data.customer.customer_code,
          planCode: data.plan.plan_code,
          status: data.status,
          amount: data.amount / 100, // Convert back to main unit
          cronExpression: data.cron_expression,
          nextPaymentDate: data.next_payment_date,
          openInvoice: data.open_invoice_code,
        });
        break;
      }
      case "customer.create":
      case "customer.update": {
        await ctx.runMutation(internal.lib.upsertCustomer, {
          paystackCustomerId: data.customer_code,
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          phone: data.phone,
          metadata: data.metadata,
        });
        break;
      }
      default:
        console.log(`Unhandled Paystack event: ${event.event}`);
    }

    return null;
  },
});
