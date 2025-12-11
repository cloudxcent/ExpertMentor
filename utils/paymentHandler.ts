import { Alert } from 'react-native';
import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { razorpayService } from './razorpayService';
import { createCashfreeService } from './cashfreeService';
import axios from 'axios';

export type PaymentProvider = 'razorpay' | 'cashfree';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerTransactionId: string;
  status: PaymentStatus;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export class PaymentHandler {
  private razorpay: ReturnType<typeof razorpayService>;
  private cashfree: ReturnType<typeof createCashfreeService>;
  private backendUrl: string;

  constructor(
    razorpayKeyId: string,
    razorpayKeySecret: string,
    cashfreeAppId: string,
    cashfreeAppSecret: string,
    backendUrl: string,
    isProduction: boolean = false
  ) {
    this.razorpay = razorpayService(razorpayKeyId, razorpayKeySecret);
    this.cashfree = createCashfreeService(cashfreeAppId, cashfreeAppSecret, isProduction);
    this.backendUrl = backendUrl;
  }

  /**
   * Initialize payment with Razorpay (via backend)
   */
  async initializeRazorpayPayment(
    userId: string,
    amount: number,
    email: string,
    contact: string,
    description: string
  ): Promise<{ orderId: string; receipt: string }> {
    try {
      console.log('[PaymentHandler] Initializing Razorpay payment:', { userId, amount });

      // Create transaction record
      const receipt = `ORDER_${userId}_${Date.now()}`;
      const transactionDoc = await this.createTransaction({
        userId,
        amount,
        currency: 'INR',
        provider: 'razorpay',
        status: 'pending',
        description,
        providerTransactionId: receipt,
      });

      // Call backend to create order
      const response = await axios.post(`${this.backendUrl}/api/payments/razorpay/order`, {
        amount: amount * 100, // Convert to paisa
        receipt,
        userId,
        email,
        contact,
        description,
      });

      if (response.data.success) {
        console.log('[PaymentHandler] Order created:', response.data.orderId);
        return {
          orderId: response.data.orderId,
          receipt: receipt,
        };
      } else {
        throw new Error(response.data.message || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('[PaymentHandler] Error initializing Razorpay:', error.message);
      throw error;
    }
  }

  /**
   * Initialize payment with Cashfree
   */
  async initializeCashfreePayment(
    userId: string,
    amount: number,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    description: string
  ): Promise<{ orderId: string; redirectUrl: string }> {
    try {
      console.log('[PaymentHandler] Initializing Cashfree payment:', { userId, amount });

      const orderId = `ORDER_${userId}_${Date.now()}`;

      // Create transaction record
      await this.createTransaction({
        userId,
        amount,
        currency: 'INR',
        provider: 'cashfree',
        status: 'pending',
        description,
        providerTransactionId: orderId,
      });

      // Call backend to create order
      const response = await axios.post(`${this.backendUrl}/api/payments/cashfree/order`, {
        orderId,
        orderAmount: amount * 100, // Convert to paisa
        orderCurrency: 'INR',
        customerName,
        customerEmail,
        customerPhone,
        orderNote: description,
        userId,
      });

      if (response.data.success) {
        console.log('[PaymentHandler] Cashfree order created:', response.data.orderId);
        return {
          orderId: response.data.orderId,
          redirectUrl: response.data.redirectUrl,
        };
      } else {
        throw new Error(response.data.message || 'Failed to create Cashfree order');
      }
    } catch (error: any) {
      console.error('[PaymentHandler] Error initializing Cashfree:', error.message);
      throw error;
    }
  }

  /**
   * Initialize payment with PhonePay
   */
  async initializePhonePayPayment(
    userId: string,
    amount: number,
    phoneNumber: string,
    description: string
  ): Promise<{ redirectUrl: string; merchantTransactionId: string }> {
    try {
      console.log('[PaymentHandler] Initializing PhonePay payment:', { userId, amount });

      const merchantTransactionId = `TXNID_${userId}_${Date.now()}`;

      // Create transaction record
      await this.createTransaction({
        userId,
        amount,
        currency: 'INR',
        provider: 'phonepay',
        status: 'pending',
        description,
        providerTransactionId: merchantTransactionId,
      });

      // Call backend to initiate payment
      const response = await axios.post(`${this.backendUrl}/api/payments/phonepay/initiate`, {
        merchantTransactionId,
        userId,
        amount,
        phoneNumber,
        description,
      });

      if (response.data.success && response.data.data?.redirectUrl) {
        console.log('[PaymentHandler] PhonePay payment initiated');
        return {
          redirectUrl: response.data.data.redirectUrl,
          merchantTransactionId,
        };
      } else {
        throw new Error(response.data.message || 'Failed to initiate PhonePay payment');
      }
    } catch (error: any) {
      console.error('[PaymentHandler] Error initializing PhonePay:', error.message);
      throw error;
    }
  }

  /**
   * Handle Cashfree webhook callback
   */
  async handleCashfreeCallback(
    orderId: string,
    eventType: string,
    paymentData: any
  ): Promise<boolean> {
    try {
      console.log('[PaymentHandler] Processing Cashfree callback:', { orderId, eventType });

      if (eventType === 'PAYMENT_SUCCESS' || eventType === 'PAYMENT_AUTHORIZATION_SUCCESS') {
        // Verify payment status with backend
        const response = await axios.post(`${this.backendUrl}/api/payments/cashfree/verify`, {
          orderId,
        });

        if (response.data.success) {
          await this.updateTransactionStatus(orderId, 'completed');
          return true;
        }
      } else if (eventType === 'PAYMENT_FAILED') {
        await this.updateTransactionStatus(orderId, 'failed');
      }

      return false;
    } catch (error: any) {
      console.error('[PaymentHandler] Error handling Cashfree callback:', error.message);
      return false;
    }
  }

  /**
   * Handle Razorpay success callback (backend)
   */
  async handleRazorpaySuccess(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean> {
    try {
      console.log('[PaymentHandler] Processing Razorpay success callback');

      // Verify signature on backend
      const response = await axios.post(`${this.backendUrl}/api/payments/razorpay/verify`, {
        orderId,
        paymentId,
        signature,
      });

      if (response.data.success) {
        // Update transaction status
        await this.updateTransactionStatus(paymentId, 'completed');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[PaymentHandler] Error verifying Razorpay payment:', error.message);
      return false;
    }
  }

  /**
   * Handle PhonePay success callback
   */
  async handlePhonePaySuccess(merchantTransactionId: string): Promise<boolean> {
    try {
      console.log('[PaymentHandler] Processing PhonePay success callback');

      // Verify payment status with PhonePay
      const response = await axios.post(
        `${this.backendUrl}/api/payments/phonepay/verify`,
        {
          merchantTransactionId,
        }
      );

      if (response.data.success && response.data.data?.state === 'COMPLETED') {
        // Update transaction status
        await this.updateTransactionStatus(merchantTransactionId, 'completed');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[PaymentHandler] Error verifying PhonePay payment:', error.message);
      return false;
    }
  }

  /**
   * Create a new transaction record in Firestore
   */
  private async createTransaction(
    data: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log('[PaymentHandler] Transaction created:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('[PaymentHandler] Error creating transaction:', error.message);
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  private async updateTransactionStatus(
    transactionId: string,
    status: PaymentStatus
  ): Promise<void> {
    try {
      // Find transaction by provider ID
      const q = query(
        collection(db, 'transactions'),
        where('providerTransactionId', '==', transactionId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn('[PaymentHandler] Transaction not found:', transactionId);
        return;
      }

      const docRef = doc(db, 'transactions', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now(),
        ...(status === 'completed' && { completedAt: Timestamp.now() }),
      });

      console.log('[PaymentHandler] Transaction updated:', transactionId, status);
    } catch (error: any) {
      console.error('[PaymentHandler] Error updating transaction:', error.message);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 10): Promise<PaymentTransaction[]> {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      const transactions: PaymentTransaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        } as PaymentTransaction);
      });

      return transactions.slice(-limit).reverse();
    } catch (error: any) {
      console.error('[PaymentHandler] Error fetching transactions:', error.message);
      return [];
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(
    transactionId: string,
    provider: PaymentProvider,
    reason?: string
  ): Promise<boolean> {
    try {
      console.log('[PaymentHandler] Refunding transaction:', transactionId);

      const response = await axios.post(`${this.backendUrl}/api/payments/refund`, {
        transactionId,
        provider,
        reason,
      });

      if (response.data.success) {
        await this.updateTransactionStatus(transactionId, 'refunded');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[PaymentHandler] Error refunding:', error.message);
      return false;
    }
  }
}

// Export singleton
export const createPaymentHandler = (
  razorpayKeyId: string,
  razorpayKeySecret: string,
  cashfreeAppId: string,
  cashfreeAppSecret: string,
  backendUrl: string,
  isProduction: boolean = false
) => {
  return new PaymentHandler(
    razorpayKeyId,
    razorpayKeySecret,
    cashfreeAppId,
    cashfreeAppSecret,
    backendUrl,
    isProduction
  );
};
