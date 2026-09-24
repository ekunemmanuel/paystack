# Convex Paystack Component

A robust, type-safe Paystack integration component for Convex.

[![npm version](https://badge.fury.io/js/@convex%2Fpaystack.svg)](https://badge.fury.io/js/@convex%2Fpaystack)

## Features

- 🔒 **Type-Safe Client**: Strongly typed methods for transactions, customers,
  and subscriptions.
- 💳 **Payments**: specific actions to initialize and verify transactions.
- 🔄 **Subscriptions**: Webhook handlers for subscription creation, updates, and
  cancellations.
- 👥 **Customers**: Sync customers from Paystack to your Convex database.
- 🪝 **Webhooks**: Built-in verification and handling of Paystack webhooks.

## Installation

Create a `convex.config.ts` file in your app's `convex/` folder and install the
component:

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import paystack from "@convex/paystack/convex.config";

const app = defineApp();
app.use(paystack);

export default app;
```

## Configuration

Set your Paystack Secret Key in your Convex dashboard or via CLI:

```sh
npx convex env set PAYSTACK_SECRET_KEY sk_test_... --component paystack
```

## Usage

### 1. Initialize the Client

In your Convex functions (e.g., `convex/example.ts`), initialize the client:

```ts
import { Paystack } from "@convex/paystack";
import { components } from "./_generated/api";

const paystack = new Paystack(components.paystack);
```

### 2. Create a Transaction

```ts
export const pay = action({
  args: { amount: v.number(), email: v.string() },
  handler: async (ctx, args) => {
    // Amount is in Naira (e.g. 5000 = 5000 NGN)
    // The component handles conversion to kobo (cents) automatically
    return await paystack.createTransaction(ctx, {
      amount: args.amount,
      email: args.email,
      metadata: { custom_field: "value" },
    });
  },
});
```

### 3. Verify a Transaction

```ts
export const verify = action({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    return await paystack.verifyTransaction(ctx, { reference: args.reference });
  },
});
```

### 4. Retrieve Data

```ts
export const getCustomer = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await paystack.getCustomerByEmail(ctx, args.email);
  },
});
```

### 5. Setup Webhooks

Expose the webhook endpoint in your `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { registerRoutes } from "@convex/paystack";
import { components } from "./_generated/api";

const http = httpRouter();

registerRoutes(http, components.paystack, {
  path: "YOUR_PATH", // default is "paystack/webhook"
});

export default http;
```

Point your Paystack Dashboard webhook URL to:
`https://<your-deployment-url>.convex.site/YOUR_PATH`

## License

Apache-2.0
