import { httpActionGeneric } from "convex/server";
import type {
  GenericActionCtx,
  GenericDataModel,
  HttpRouter,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";
import type { PaystackEvent, EventMap } from "./events.js";

export * from "./events.js";

// Type for the handlers object where keys are event names and values are typed handlers
export type HandlerMap = {
  [K in keyof EventMap]?: (
    ctx: GenericActionCtx<GenericDataModel>,
    event: EventMap[K],
  ) => Promise<void>;
};

export function registerRoutes(
  http: HttpRouter,
  component: ComponentApi,
  options: {
    path?: string;
    handlers?: HandlerMap;
  } = {},
) {
  const path = options.path || "/paystack/webhook";

  http.route({
    path: `${path}`,
    method: "POST",
    handler: httpActionGeneric(async (ctx, request) => {
      const signature = request.headers.get("x-paystack-signature");
      if (!signature) {
        return new Response("No signature", { status: 400 });
      }

      const body = await request.text();
      const secretKey = process.env.PAYSTACK_SECRET_KEY;

      if (!secretKey) {
        console.error("PAYSTACK_SECRET_KEY not set");
        return new Response("Server config error", { status: 500 });
      }

      try {
        // 1. Internal Component Logic (Signature verification + Payment Update)
        await ctx.runAction(component.paystack.webhookHandler, {
          signature,
          body,
          secretKey,
        });

        // 2. Custom Handlers
        const event = JSON.parse(body);

        if (options.handlers) {
          const eventType = event.event as keyof EventMap;
          const handler = options.handlers[eventType];
          if (handler) {
            // @ts-ignore
            await handler(ctx, event);
          }
        }

        return new Response("OK", { status: 200 });
      } catch (e: any) {
        console.error("Webhook processing failed", e);
        return new Response("Error", { status: 500 });
      }
    }),
  });
}

// ============================================================================
// TYPE-SAFE CLIENT
// ============================================================================

export interface Customer {
  paystackCustomerId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  metadata?: any;
}

export interface TransactionResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface Subscription {
  paystackSubscriptionId: string;
  paystackCustomerId: string;
  planCode: string;
  status: string;
  amount: number;
}

export interface Payment {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  metadata?: any;
}

export class Paystack {
  private secretKey: string;

  constructor(public component: ComponentApi) {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!;
  }

  /**
   * Run a Convex action to initialize a Paystack transaction.
   */
  async createTransaction(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runAction">,
    args: {
      amount: number;
      email: string;
      currency?: string;
      reference?: string;
      name?: string | null;
      phone?: string | null;
      metadata?: any;
      callback_url?: string;
      plan?: string;
      channels?: string[];
    },
  ): Promise<TransactionResponse> {
    return await ctx.runAction(this.component.paystack.createTransaction, {
      ...args,
      secretKey: this.secretKey,
    });
  }

  /**
   * Verify a transaction by reference.
   */
  async verifyTransaction(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runAction">,
    args: { reference: string },
  ) {
    return await ctx.runAction(this.component.paystack.verifyTransaction, {
      ...args,
      secretKey: this.secretKey,
    });
  }

  /**
   * Get a specific customer from the database.
   */
  async getCustomer(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runQuery">,
    paystackCustomerId: string,
  ): Promise<Customer | null> {
    return (await ctx.runQuery(this.component.public.getCustomer, {
      paystackCustomerId,
    })) as Customer | null;
  }

  /**
   * Get a customer by email.
   */
  async getCustomerByEmail(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runQuery">,
    email: string,
  ): Promise<Customer | null> {
    return (await ctx.runQuery(this.component.public.getCustomerByEmail, {
      email,
    })) as Customer | null;
  }

  /**
   * List all subscriptions for a customer.
   */
  async listSubscriptions(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runQuery">,
    paystackCustomerId: string,
  ): Promise<Subscription[]> {
    return (await ctx.runQuery(this.component.public.listSubscriptions, {
      paystackCustomerId,
    })) as Subscription[];
  }

  /**
   * Get a payment by reference.
   */
  async getPayment(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runQuery">,
    reference: string,
  ): Promise<Payment | null> {
    return (await ctx.runQuery(this.component.public.getPayment, {
      reference,
    })) as Payment | null;
  }

  /**
   * Create or update a customer record in the database.
   * Useful for syncing data manually.
   */
  async createOrUpdateCustomer(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runMutation">,
    args: Customer,
  ): Promise<string> {
    return await ctx.runMutation(this.component.public.createOrUpdateCustomer, {
      ...args,
    });
  }
}
