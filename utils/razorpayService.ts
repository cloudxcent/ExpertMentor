import { Alert } from 'react-native';
import axios from 'axios';

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface PaymentDetails {
  amount: number; // in paisa (smallest unit)
  userId: string;
  email: string;
  contact: string;
  description: string;
  orderId?: string;
}

export class RazorpayService {
  private keyId: string;
  private keySecret: string;
  private baseURL = 'https://api.razorpay.com/v1';

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  /**
   * Create a Razorpay order
   * Must be called from backend
   */
  async createOrder(amount: number, receipt: string): Promise<RazorpayOrder> {
    try {
      const response = await axios.post(
        `${this.baseURL}/orders`,
        {
          amount: amount, // in paisa
          currency: 'INR',
          receipt: receipt,
          partial_payment: false,
          notes: {
            app: 'ExpertMentor',
            timestamp: new Date().toISOString(),
          },
        },
        {
          auth: {
            username: this.keyId,
            password: this.keySecret,
          },
        }
      );

      console.log('[Razorpay] Order created:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('[Razorpay] Error creating order:', error.response?.data || error.message);
      throw new Error(error.response?.data?.description || 'Failed to create order');
    }
  }

  /**
   * Verify payment signature
   * Must be called from backend for security
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret?: string
  ): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret || this.keySecret);
    const payload = `${orderId}|${paymentId}`;
    hmac.update(payload);
    const generatedSignature = hmac.digest('hex');

    const isValid = generatedSignature === signature;
    console.log('[Razorpay] Signature verification:', isValid ? 'Valid' : 'Invalid');
    return isValid;
  }

  /**
   * Fetch payment details
   */
  async getPaymentDetails(paymentId: string) {
    try {
      const response = await axios.get(
        `${this.baseURL}/payments/${paymentId}`,
        {
          auth: {
            username: this.keyId,
            password: this.keySecret,
          },
        }
      );
      console.log('[Razorpay] Payment details fetched:', paymentId);
      return response.data;
    } catch (error: any) {
      console.error('[Razorpay] Error fetching payment:', error.message);
      throw new Error('Failed to fetch payment details');
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number, notes?: Record<string, any>) {
    try {
      const response = await axios.post(
        `${this.baseURL}/payments/${paymentId}/refund`,
        {
          amount: amount, // optional, refunds full amount if not provided
          notes: notes,
        },
        {
          auth: {
            username: this.keyId,
            password: this.keySecret,
          },
        }
      );

      console.log('[Razorpay] Refund initiated:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('[Razorpay] Error refunding:', error.message);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Initiate payment (client-side)
   * This opens the Razorpay payment modal
   */
  async initiatePayment(
    options: {
      amount: number;
      orderId: string;
      email: string;
      contact: string;
      description: string;
      onSuccess: (response: RazorpayPaymentResponse) => Promise<void>;
      onError: (error: any) => void;
    }
  ): Promise<void> {
    try {
      // This would require Razorpay mobile SDK or web SDK
      // For React Native Expo, you might need to use web view or native module
      console.log('[Razorpay] Payment initiation requested:', {
        amount: options.amount,
        orderId: options.orderId,
      });

      // Check if running on web or mobile
      // For web: use direct checkout
      // For mobile: use Razorpay SDK via native module or WebView
      
      Alert.alert('Info', 'Razorpay payment modal would open here');
    } catch (error: any) {
      console.error('[Razorpay] Error initiating payment:', error);
      options.onError(error);
    }
  }
}

// Export singleton instance
export const razorpayService = (keyId: string, keySecret: string) => {
  return new RazorpayService(keyId, keySecret);
};
