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
        // We parse the body here to pass it to the handler
        const event = JSON.parse(body);

        if (options.handlers) {
          const eventType = event.event as keyof EventMap;
          const handler = options.handlers[eventType];
          if (handler) {
            // We know this is safe because we trust the Paystack event type field matches the structure
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

export class PaystackClient {
  private secretKey: string;

  constructor(public component: ComponentApi) {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY!;
  }

  async createTransaction(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runAction">,
    args: {
      amount: number;
      email: string;
      currency?: string;
      reference?: string;
      name?: string;
      phone?: string;
      metadata?: any;
      callback_url?: string;
    },
  ) {
    return await ctx.runAction(this.component.paystack.createTransaction, {
      ...args,
      secretKey: this.secretKey,
    });
  }

  async verifyTransaction(
    ctx: Pick<GenericActionCtx<GenericDataModel>, "runAction">,
    args: { reference: string },
  ) {
    return await ctx.runAction(this.component.paystack.verifyTransaction, {
      ...args,
      secretKey: this.secretKey,
    });
  }
}
