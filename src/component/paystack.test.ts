import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api.js";
import schema from "./schema.js";
import { modules } from "./setup.test.js";

test("customer creation and retrieval", async () => {
  const t = convexTest(schema, modules);

  // Create or Update Customer
  const paystackCustomerId = await t.mutation(
    api.public.createOrUpdateCustomer,
    {
      paystackCustomerId: "CUS_123456789",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      phone: "+2348012345678",
      metadata: { source: "test" },
    },
  );

  expect(paystackCustomerId).toBe("CUS_123456789");

  // Retrieve by ID
  const customer = await t.query(api.public.getCustomer, {
    paystackCustomerId: "CUS_123456789",
  });

  expect(customer).toBeDefined();
  expect(customer?.email).toBe("test@example.com");
  expect(customer?.firstName).toBe("Test");

  // Retrieve by Email
  const customerByEmail = await t.query(api.public.getCustomerByEmail, {
    email: "test@example.com",
  });
  expect(customerByEmail).toBeDefined();
  expect(customerByEmail?.paystackCustomerId).toBe("CUS_123456789");
});

test("payment storage and retrieval", async () => {
  const t = convexTest(schema, modules);

  // Store Payment (Internal Lib)
  const paymentId = await t.mutation(internal.lib.storePayment, {
    reference: "REF_123456789",
    amount: 5000,
    currency: "NGN",
    email: "payer@example.com",
    metadata: { orderId: "123" },
    paystackCustomerId: "CUS_PAYER_1",
  });

  // Get Payment
  const payment = await t.query(api.public.getPayment, {
    reference: "REF_123456789",
  });

  expect(payment).toBeDefined();
  expect(payment?.amount).toBe(5000);
  expect(payment?.status).toBe("pending");
  expect(payment?.paystackCustomerId).toBe("CUS_PAYER_1");

  // Update Payment Status
  await t.mutation(internal.lib.updatePaymentStatus, {
    paymentId,
    status: "success",
    paystackId: "PAY_987654321",
    channel: "card",
    paidAt: "2023-01-01T12:00:00.000Z",
  });

  // Verify Update
  const updatedPayment = await t.query(api.public.getPayment, {
    reference: "REF_123456789",
  });

  expect(updatedPayment?.status).toBe("success");
  expect(updatedPayment?.paystackId).toBe("PAY_987654321");
  expect(updatedPayment?.channel).toBe("card");
});

test("subscription handling", async () => {
  const t = convexTest(schema, modules);

  // Upsert Subscription (Internal Lib - simulated webhook)
  await t.mutation(internal.lib.upsertSubscription, {
    paystackSubscriptionId: "SUB_ABC123",
    paystackCustomerId: "CUS_SUB_1",
    planCode: "PLN_PREMIUM",
    status: "active",
    amount: 2000,
    cronExpression: "0 0 * * *",
    nextPaymentDate: "2023-02-01T12:00:00.000Z",
  });

  // Get Subscription
  const subscription = await t.query(api.public.getSubscription, {
    paystackSubscriptionId: "SUB_ABC123",
  });

  expect(subscription).toBeDefined();
  expect(subscription?.status).toBe("active");
  expect(subscription?.planCode).toBe("PLN_PREMIUM");

  // List Subscriptions for Customer
  const subscriptions = await t.query(api.public.listSubscriptions, {
    paystackCustomerId: "CUS_SUB_1",
  });

  expect(subscriptions).toHaveLength(1);
  expect(subscriptions[0].paystackSubscriptionId).toBe("SUB_ABC123");
});

test("handling null values in customer upsert", async () => {
  const t = convexTest(schema, modules);

  // Upsert Customer with null values (simulated webhook data)
  await t.mutation(internal.lib.upsertCustomer, {
    paystackCustomerId: "CUS_NULL_TEST",
    email: "null@example.com",
    firstName: null,
    lastName: null,
    phone: null,
    metadata: { note: "testing nulls" },
  });

  const customer = await t.query(api.public.getCustomer, {
    paystackCustomerId: "CUS_NULL_TEST",
  });

  expect(customer).toBeDefined();
  expect(customer?.firstName).toBeNull();
  expect(customer?.lastName).toBeNull();
});

test("status history deduplication", async () => {
  const t = convexTest(schema, modules);

  const paymentId = await t.mutation(internal.lib.storePayment, {
    reference: "HIST_123",
    amount: 100,
    currency: "NGN",
    email: "hist@example.com",
  });

  // 1. Initial status is pending. Update to success.
  await t.mutation(internal.lib.updatePaymentStatus, {
    paymentId,
    status: "success",
  });

  // 2. Update to success again. Should NOT add to history.
  await t.mutation(internal.lib.updatePaymentStatus, {
    paymentId,
    status: "success",
  });

  const payment = await t.query(api.public.getPayment, {
    reference: "HIST_123",
  });

  // History should be: [pending, success]
  expect(payment?.statusHistory).toHaveLength(2);
  expect(payment?.statusHistory[0].status).toBe("pending");
  expect(payment?.statusHistory[1].status).toBe("success");
});

test("idempotency in createTransaction", async () => {
  const t = convexTest(schema, modules);
  const email = "idem@example.com";
  const amount = 5000;

  // 1. Seed an existing pending payment
  await t.mutation(internal.lib.storePayment, {
    reference: "REF_MATCH",
    amount,
    currency: "NGN",
    email,
    authorizationUrl: "https://checkout.paystack.com/match",
    accessCode: "ACC_MATCH",
  });

  // 2. Call createTransaction without reference - should match by email/amount
  const result1 = await t.action(api.paystack.createTransaction, {
    amount,
    email,
    secretKey: "sk_test_mock",
  });
  expect(result1.authorization_url).toBe("https://checkout.paystack.com/match");

  // 3. Call with different plan - should NOT match (would fail because fetch is not mocked)
  // We can't easily test the "NOT match" case here without mocking fetch properly in the action,
  // but we can at least verify the matching logic works.
});

test("plan-specific idempotency", async () => {
  const t = convexTest(schema, modules);
  const email = "plan@example.com";
  const amount = 10000;

  await t.mutation(internal.lib.storePayment, {
    reference: "REF_PLAN",
    amount,
    currency: "NGN",
    email,
    plan: "PLN_ABC",
    authorizationUrl: "https://checkout.paystack.com/plan",
    accessCode: "ACC_PLAN",
  });

  // Should match if plan matches
  const result = await t.action(api.paystack.createTransaction, {
    amount,
    email,
    plan: "PLN_ABC",
    secretKey: "sk_test_mock",
  });
  expect(result.authorization_url).toBe("https://checkout.paystack.com/plan");
});
