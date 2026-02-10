import { action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";

export const createTransaction = action({
  args: {
    amount: v.number(),
    email: v.string(),
    currency: v.optional(v.string()), // Default NGN
    reference: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    metadata: v.optional(v.any()), // Allow passing object, will stringify
    callback_url: v.optional(v.string()),
    secretKey: v.optional(v.string()), // Pass in the secret key
  },
  returns: v.object({
    authorization_url: v.string(),
    access_code: v.string(),
    reference: v.string(),
  }),
  handler: async (ctx, args) => {
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
          amount: args.amount * 100,
          email: args.email,
          currency,
          reference: args.reference,
          callback_url: args.callback_url,
          metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
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
      metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
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

    // 3. Update status in DB
    await ctx.runMutation(internal.lib.updatePaymentStatus, {
      paymentId: payment._id,
      status: newStatus,
      metadata: JSON.stringify(paystackData),
      paystackId: paystackData.id ? String(paystackData.id) : "",
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

    if (event.event === "charge.success") {
      const { reference, status, metadata, id } = event.data;

      const payment = await ctx.runQuery(internal.lib.getPayment, {
        reference,
      });

      if (payment) {
        await ctx.runMutation(internal.lib.updatePaymentStatus, {
          paymentId: payment._id,
          status,
          metadata: JSON.stringify(metadata ?? event.data),
          paystackId: id ? String(id) : undefined,
        });
      }
    }

    return null;
  },
});
