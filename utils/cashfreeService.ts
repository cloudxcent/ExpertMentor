import axios from 'axios';
import { Alert } from 'react-native';
import * as crypto from 'crypto';

interface CashfreePaymentRequest {
  orderId: string;
  orderAmount: number; // in smallest currency unit (paisa/paise)
  orderCurrency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderNote: string;
  returnUrl: string;
  notifyUrl: string;
  paymentMethods?: string; // e.g., "upi,card,nb" (UPI, Card, Net Banking)
}

interface CashfreePaymentResponse {
  cf_order_id: number;
  order_id: string;
  entity: string;
  order_status: string;
  order_currency: string;
  order_amount: number;
  order_expiry_time: string;
  customer_details: {
    customer_id: string;
    customer_email: string;
    customer_phone: string;
    customer_name: string;
  };
  order_meta: {
    notify_url: string;
    return_url: string;
    payment_methods?: string;
  };
  settlements?: any;
  payments?: any;
  refunds?: any;
  order_splits?: any;
  error_details?: any;
}

interface CashfreePaymentStatusResponse {
  cf_order_id: number;
  order_id: string;
  order_status: 'PENDING' | 'PAID' | 'ACTIVE' | 'EXPIRED';
  order_amount: number;
  order_currency: string;
  order_expiry_time: string;
  customer_details: {
    customer_id: string;
    customer_email: string;
    customer_phone: string;
    customer_name: string;
  };
  order_meta: {
    notify_url: string;
    return_url: string;
  };
  payments?: Array<{
    cf_payment_id: number;
    payment_status: 'SUCCESS' | 'FAILED' | 'PENDING';
    payment_amount: number;
    payment_currency: string;
    payment_method: {
      upi?: {
        upi_id: string;
      };
      card?: {
        channel: string;
        card_number: string;
        card_network: string;
        card_type: string;
        card_subtype: string;
        card_issuer?: string;
        card_international: boolean;
        card_emi: boolean;
        card_recurring: boolean;
        instrument_id?: string;
      };
      netbanking?: {
        netbank_code: string;
        netbank_name: string;
      };
    };
    payment_time: string;
    error_details?: any;
    refunds?: any;
  }>;
}

interface CashfreeRefundRequest {
  orderId: string;
  refundAmount: number;
  refundNote: string;
}

interface CashfreeRefundResponse {
  cf_refund_id: number;
  cf_payment_id: number;
  order_id: string;
  refund_id: string;
  entity: string;
  refund_amount: number;
  refund_currency: string;
  refund_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  refund_note: string;
  refund_splits?: any;
  receipt?: string;
  refund_time?: string;
  batch_transfer_id?: string;
  batch_id?: string;
  error_details?: any;
}

/**
 * Cashfree Payment Service
 * Handles all Cashfree payment operations including order creation,
 * payment status checking, and refunds.
 *
 * Docs: https://docs.cashfree.com/docs/payment-gateway/
 */
export class CashfreeService {
  private appId: string;
  private appSecret: string;
  private baseURL = 'https://api.cashfree.com/pg';
  private sandboxBaseURL = 'https://sandbox.cashfree.com/pg'; // For testing
  private isProduction: boolean;

  constructor(appId: string, appSecret: string, isProduction: boolean = false) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.isProduction = isProduction;
  }

  /**
   * Get the appropriate base URL based on environment
   */
  private getBaseURL(): string {
    return this.isProduction ? this.baseURL : this.sandboxBaseURL;
  }

  /**
   * Generate X-Client-Id and X-Client-Secret headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'X-Client-Id': this.appId,
      'X-Client-Secret': this.appSecret,
      'X-API-REQUEST-ID': `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a payment order in Cashfree
   * Must be called from backend
   */
  async createOrder(request: CashfreePaymentRequest): Promise<CashfreePaymentResponse> {
    try {
      console.log('[CashfreeService] Creating order:', request.orderId);

      const payload = {
        order_id: request.orderId,
        order_amount: request.orderAmount,
        order_currency: request.orderCurrency || 'INR',
        customer_details: {
          customer_name: request.customerName,
          customer_email: request.customerEmail,
          customer_phone: request.customerPhone,
        },
        order_meta: {
          return_url: request.returnUrl,
          notify_url: request.notifyUrl,
          payment_methods: request.paymentMethods || 'upi,card,nb',
        },
        order_note: request.orderNote,
        order_expiry_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
      };

      const response = await axios.post(`${this.getBaseURL()}/orders`, payload, {
        headers: this.getHeaders(),
      });

      console.log('[CashfreeService] Order created successfully:', response.data.order_id);
      return response.data;
    } catch (error: any) {
      console.error('[CashfreeService] Error creating order:', error.response?.data || error.message);
      throw new Error(`Failed to create Cashfree order: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get payment order status
   */
  async getOrderStatus(orderId: string): Promise<CashfreePaymentStatusResponse> {
    try {
      console.log('[CashfreeService] Fetching order status:', orderId);

      const response = await axios.get(`${this.getBaseURL()}/orders/${orderId}`, {
        headers: this.getHeaders(),
      });

      console.log('[CashfreeService] Order status retrieved:', response.data.order_status);
      return response.data;
    } catch (error: any) {
      console.error('[CashfreeService] Error fetching order status:', error.response?.data || error.message);
      throw new Error(`Failed to fetch order status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Validate webhook signature from Cashfree
   * Called when receiving payment status callback
   */
  validateWebhookSignature(requestBody: any, signature: string): boolean {
    try {
      // Cashfree uses SHA256 for signature verification
      // The signature is computed on the request body
      const computedSignature = crypto
        .createHmac('sha256', this.appSecret)
        .update(JSON.stringify(requestBody))
        .digest('base64');

      const isValid = computedSignature === signature;
      console.log('[CashfreeService] Webhook signature validation:', isValid);
      return isValid;
    } catch (error) {
      console.error('[CashfreeService] Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Process refund for a payment
   * Can only refund payments that are in SUCCESS state
   */
  async refundPayment(orderId: string, refundAmount: number, refundNote: string): Promise<CashfreeRefundResponse> {
    try {
      console.log('[CashfreeService] Processing refund:', {
        orderId,
        refundAmount,
        refundNote,
      });

      // First, get the order to find the payment ID
      const orderStatus = await this.getOrderStatus(orderId);

      if (!orderStatus.payments || orderStatus.payments.length === 0) {
        throw new Error('No payments found for this order');
      }

      const successfulPayment = orderStatus.payments.find((p: any) => p.payment_status === 'SUCCESS');
      if (!successfulPayment) {
        throw new Error('No successful payment found to refund');
      }

      const paymentId = successfulPayment.cf_payment_id;

      const payload = {
        refund_amount: refundAmount,
        refund_note: refundNote,
      };

      const response = await axios.post(
        `${this.getBaseURL()}/orders/${orderId}/payments/${paymentId}/refunds`,
        payload,
        {
          headers: this.getHeaders(),
        }
      );

      console.log('[CashfreeService] Refund processed successfully:', response.data.refund_id);
      return response.data;
    } catch (error: any) {
      console.error('[CashfreeService] Error processing refund:', error.response?.data || error.message);
      throw new Error(`Failed to process refund: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get refund status
   */
  async getRefundStatus(orderId: string, refundId: string): Promise<CashfreeRefundResponse> {
    try {
      console.log('[CashfreeService] Fetching refund status:', { orderId, refundId });

      const response = await axios.get(`${this.getBaseURL()}/orders/${orderId}/refunds/${refundId}`, {
        headers: this.getHeaders(),
      });

      console.log('[CashfreeService] Refund status retrieved:', response.data.refund_status);
      return response.data;
    } catch (error: any) {
      console.error('[CashfreeService] Error fetching refund status:', error.response?.data || error.message);
      throw new Error(`Failed to fetch refund status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get payment details from order
   * Returns the successful payment information
   */
  async getPaymentDetails(orderId: string): Promise<any> {
    try {
      console.log('[CashfreeService] Fetching payment details:', orderId);

      const orderStatus = await this.getOrderStatus(orderId);

      if (!orderStatus.payments || orderStatus.payments.length === 0) {
        throw new Error('No payments found for this order');
      }

      const successfulPayment = orderStatus.payments.find((p: any) => p.payment_status === 'SUCCESS');
      if (!successfulPayment) {
        throw new Error('No successful payment found');
      }

      console.log('[CashfreeService] Payment details retrieved');
      return successfulPayment;
    } catch (error: any) {
      console.error('[CashfreeService] Error fetching payment details:', error.message);
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
  }

  /**
   * Get payment link for completing payment on frontend
   * This is typically generated by the backend and sent to frontend
   */
  async getPaymentLink(orderId: string, orderStatus: CashfreePaymentStatusResponse): Promise<string> {
    try {
      console.log('[CashfreeService] Generating payment link for order:', orderId);

      // Cashfree provides a payment session ID that can be used with their hosted checkout
      // The link format is: https://checkout.cashfree.com/pay/{sessionId}
      // This is returned in the order response after creation

      // For now, return the redirect URL that would be used
      const paymentLink = `https://${this.isProduction ? '' : 'sandbox.'}cashfree.com/pg/order/${orderId}`;
      console.log('[CashfreeService] Payment link generated');
      return paymentLink;
    } catch (error: any) {
      console.error('[CashfreeService] Error generating payment link:', error.message);
      throw new Error(`Failed to generate payment link: ${error.message}`);
    }
  }
}

/**
 * Factory function to create Cashfree service instance
 */
export const createCashfreeService = (appId: string, appSecret: string, isProduction: boolean = false) => {
  return new CashfreeService(appId, appSecret, isProduction);
};
