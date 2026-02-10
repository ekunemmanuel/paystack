/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    paystack: {
      createTransaction: FunctionReference<
        "action",
        "internal",
        {
          amount: number;
          callback_url?: string;
          currency?: string;
          email: string;
          metadata?: any;
          name?: string;
          phone?: string;
          reference?: string;
          secretKey?: string;
        },
        { access_code: string; authorization_url: string; reference: string },
        Name
      >;
      verifyTransaction: FunctionReference<
        "action",
        "internal",
        { reference: string; secretKey?: string },
        { message: string; reference: string; status: string },
        Name
      >;
      webhookHandler: FunctionReference<
        "action",
        "internal",
        { body: string; secretKey?: string; signature: string },
        null,
        Name
      >;
    };
  };
