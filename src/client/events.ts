/**
 * Discriminated union of Paystack Webhook Events
 * Based on https://paystack.com/docs/payments/webhooks/#supported-events
 */

export interface BaseEvent<TType extends string, TData = any> {
  event: TType;
  data: TData;
}

// --- Payment & Transaction Events ---

export interface ChargeSuccessData {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  message?: string;
  gateway_response?: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address?: string;
  metadata?: any;
  customer: {
    id: number;
    first_name?: string;
    last_name?: string;
    email: string;
    customer_code: string;
    phone?: string;
    metadata?: any;
    risk_action?: string;
  };
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel?: string;
    card_type: string;
    bank: string;
    country_code?: string;
    brand: string;
    reusable?: boolean;
    signature?: string;
    account_name?: string;
  };
  plan?: any;
  subaccount?: any;
  split?: any;
  order_id?: any;
  paidAt?: string;
  requested_amount?: number;
  pos_transaction_data?: any;
  source?: any;
  fees?: any;
}
export type ChargeSuccessEvent = BaseEvent<"charge.success", ChargeSuccessData>;

// --- Transfer Events ---

export interface TransferData {
  amount: number;
  currency: string;
  domain?: string;
  failures?: any;
  id?: number;
  integration?: number;
  reason?: string;
  reference?: string;
  source?: string;
  source_details?: any;
  status: string;
  titan_code?: string;
  transfer_code: string;
  transferred_at?: string;
  recipient: {
    active?: boolean;
    currency?: string;
    description?: string;
    domain?: string;
    email?: string;
    id?: number;
    integration?: number;
    metadata?: any;
    name: string;
    recipient_code: string;
    type?: string;
    is_deleted?: boolean;
    details: {
      account_number: string;
      account_name?: string;
      bank_code?: string;
      bank_name: string;
    };
  };
  session?: {
    provider?: string;
    id?: any;
  };
  created_at?: string;
  updated_at?: string;
}
export type TransferSuccessEvent = BaseEvent<"transfer.success", TransferData>;
export type TransferFailedEvent = BaseEvent<"transfer.failed", TransferData>;
export type TransferReversedEvent = BaseEvent<
  "transfer.reversed",
  TransferData
>;

// --- Subscription Events ---

export interface SubscriptionData {
  id?: number;
  domain?: string;
  status: string; // active, complete, etc.
  subscription_code: string;
  amount: number;
  cron_expression?: string;
  next_payment_date: string;
  open_invoice?: any;
  createdAt?: string;
  plan: {
    name: string;
    plan_code: string;
    description?: string;
    amount?: number;
    interval: string; // monthly, annually, etc.
    send_invoices?: boolean;
    send_sms?: boolean;
    currency?: string;
  };
  customer: {
    first_name?: string;
    last_name?: string;
    email: string;
    customer_code?: string;
    phone?: string;
    metadata?: any;
    risk_action?: string;
  };
  authorization?: {
    authorization_code?: string;
    bin?: string;
    last4?: string;
    exp_month?: string;
    exp_year?: string;
    card_type?: string;
  };
  created_at?: string;
}
export type SubscriptionCreateEvent = BaseEvent<
  "subscription.create",
  SubscriptionData
>;
export type SubscriptionDisableEvent = BaseEvent<
  "subscription.disable",
  SubscriptionData
>;
export type SubscriptionNotRenewingEvent = BaseEvent<
  "subscription.not_renewing",
  SubscriptionData
>;
export type SubscriptionExpiringCardsEvent = BaseEvent<
  "subscription.expiring_cards",
  SubscriptionData
>;

// --- Invoice Events ---

export interface InvoiceData {
  domain?: string;
  invoice_code?: string;
  amount: number;
  period_start?: string;
  period_end?: string;
  status: string;
  paid?: boolean;
  paid_at?: string;
  description?: string;
  authorization?: any;
  subscription?: any;
  customer: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email: string;
    customer_code?: string;
    phone?: string;
    metadata?: any;
    risk_action?: string;
  };
  transaction?: any;
  created_at?: string;
}

export type InvoiceCreateEvent = BaseEvent<"invoice.create", InvoiceData>;
export type InvoicePaymentFailedEvent = BaseEvent<
  "invoice.payment_failed",
  InvoiceData
>;
export type InvoiceUpdateEvent = BaseEvent<"invoice.update", InvoiceData>;

// --- Refund Events ---

export interface RefundData {
  id?: number;
  refund_definition?: any;
  amount: number;
  currency: string;
  transaction_reference?: string;
  status: string;
  deducted_amount?: number;
  fully_deducted?: boolean;
  refunded_by?: string;
  refunded_at?: string;
  transaction?: {
    id?: number;
    domain?: string;
    status?: string;
    reference?: string;
    amount?: number;
    message?: string;
    gateway_response?: string;
    paid_at?: string;
    created_at?: string;
    channel?: string;
    currency?: string;
    ip_address?: string;
    metadata?: any;
  };
  customer?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email: string;
    customer_code?: string;
    phone?: string;
  };
  created_at?: string;
}
export type RefundPendingEvent = BaseEvent<"refund.pending", RefundData>;
export type RefundProcessedEvent = BaseEvent<"refund.processed", RefundData>;
export type RefundProcessingEvent = BaseEvent<"refund.processing", RefundData>;
export type RefundFailedEvent = BaseEvent<"refund.failed", RefundData>;

// -- Generic Fallback --
export type UnknownEvent = BaseEvent<string, any>;

// Union Type
export type PaystackEvent =
  | ChargeSuccessEvent
  | TransferSuccessEvent
  | TransferFailedEvent
  | TransferReversedEvent
  | SubscriptionCreateEvent
  | SubscriptionDisableEvent
  | SubscriptionNotRenewingEvent
  | SubscriptionExpiringCardsEvent
  | InvoiceCreateEvent
  | InvoicePaymentFailedEvent
  | InvoiceUpdateEvent
  | RefundPendingEvent
  | RefundProcessedEvent
  | RefundProcessingEvent
  | RefundFailedEvent
  | UnknownEvent;

// Map for strict typing in handlers
export interface EventMap {
  "charge.success": ChargeSuccessEvent;
  "transfer.success": TransferSuccessEvent;
  "transfer.failed": TransferFailedEvent;
  "transfer.reversed": TransferReversedEvent;
  "subscription.create": SubscriptionCreateEvent;
  "subscription.disable": SubscriptionDisableEvent;
  "subscription.not_renewing": SubscriptionNotRenewingEvent;
  "subscription.expiring_cards": SubscriptionExpiringCardsEvent;
  "invoice.create": InvoiceCreateEvent;
  "invoice.payment_failed": InvoicePaymentFailedEvent;
  "invoice.update": InvoiceUpdateEvent;
  "refund.pending": RefundPendingEvent;
  "refund.processed": RefundProcessedEvent;
  "refund.processing": RefundProcessingEvent;
  "refund.failed": RefundFailedEvent;
}
