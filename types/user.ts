export interface User {
  id: string;
  name: string;
  email?: string;
  mobileNumber?: string;
  phoneNumber: string;
  bio: string;
  profileImage?: string;
  userType: 'mentor' | 'client';
  isOnline?: boolean;
  createdAt: Date;
  walletBalance: number;
  totalEarnings: number;
}

export interface MentorProfile extends User {
  userType: 'mentor';
  experience: number;
  expertise: string[];
  industries: string[];
  chatRatePerMinute: number;
  audioCallRatePerMinute: number;
  videoCallRatePerMinute: number;
  rating: number;
  totalReviews: number;
  totalEarnings: number;
  totalSessions: number;
  isAvailable: boolean;
}

export interface ClientProfile extends User {
  userType: 'client';
  walletBalance: number;
  totalSpent: number;
}

export interface Session {
  id: string;
  mentorId: string;
  clientId: string;
  type: 'chat' | 'call';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  cost: number;
  rating?: number;
  review?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  sessionId?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export interface WalletTopUp {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: 'card' | 'upi' | 'netbanking';
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}