import { httpRouter } from "convex/server";
import { registerRoutes } from "@pablodalpha/paystack";
import { api, components } from "./_generated/api";

const http = httpRouter();

registerRoutes(http, components.paystack, {
  handlers: {
    "charge.success": async (ctx, event) => {
      // This runs in your App's context
      await ctx.runMutation(api.example.createOrder, {
        amount: event.data.amount / 100,
        email: event.data.customer.email || "",
        name:
          event.data.customer.first_name + " " + event.data.customer.last_name,
        phone: event.data.customer.phone || "",
        metadata: event.data.metadata,
        status: event.data.status,
        reference: event.data.reference,
      });
    },
  },
});

export default http;
