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
          channels?: Array<string>;
          currency?: string;
          email: string;
          metadata?: any;
          name?: string | null;
          phone?: string | null;
          plan?: string;
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
    public: {
      createOrUpdateCustomer: FunctionReference<
        "mutation",
        "internal",
        {
          email: string;
          firstName?: string | null;
          lastName?: string | null;
          metadata?: any;
          paystackCustomerId: string;
          phone?: string | null;
        },
        string,
        Name
      >;
      getCustomer: FunctionReference<
        "query",
        "internal",
        { paystackCustomerId: string },
        {
          email: string;
          firstName?: string | null;
          lastName?: string | null;
          metadata?: any;
          paystackCustomerId: string;
          phone?: string | null;
        } | null,
        Name
      >;
      getCustomerByEmail: FunctionReference<
        "query",
        "internal",
        { email: string },
        {
          email: string;
          firstName?: string | null;
          lastName?: string | null;
          metadata?: any;
          paystackCustomerId: string;
          phone?: string | null;
        } | null,
        Name
      >;
      getPayment: FunctionReference<
        "query",
        "internal",
        { reference: string },
        {
          accessCode?: string;
          amount: number;
          authorizationUrl?: string;
          channel?: string | null;
          currency: string;
          email: string;
          metadata?: any;
          name?: string | null;
          paidAt?: string | null;
          paystackCustomerId?: string;
          paystackId?: string;
          phone?: string | null;
          plan?: string;
          reference: string;
          status: string;
          statusHistory: Array<{ status: string; timestamp: number }>;
          updateTime: number;
        } | null,
        Name
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { paystackSubscriptionId: string },
        {
          amount: number;
          cronExpression?: string;
          metadata?: any;
          nextPaymentDate?: string;
          openInvoice?: string;
          paystackCustomerId: string;
          paystackSubscriptionId: string;
          planCode: string;
          status: string;
        } | null,
        Name
      >;
      listPayments: FunctionReference<
        "query",
        "internal",
        { paystackCustomerId: string },
        Array<{
          accessCode?: string;
          amount: number;
          authorizationUrl?: string;
          channel?: string | null;
          currency: string;
          email: string;
          metadata?: any;
          name?: string | null;
          paidAt?: string | null;
          paystackCustomerId?: string;
          paystackId?: string;
          phone?: string | null;
          plan?: string;
          reference: string;
          status: string;
          statusHistory: Array<{ status: string; timestamp: number }>;
          updateTime: number;
        }>,
        Name
      >;
      listSubscriptions: FunctionReference<
        "query",
        "internal",
        { paystackCustomerId: string },
        Array<{
          amount: number;
          cronExpression?: string;
          metadata?: any;
          nextPaymentDate?: string;
          openInvoice?: string;
          paystackCustomerId: string;
          paystackSubscriptionId: string;
          planCode: string;
          status: string;
        }>,
        Name
      >;
    };
  };
