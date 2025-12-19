import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, TrendingUp, Users, DollarSign, Star, Clock, Target, BarChart3, PieChart } from 'lucide-react-native';
import { auth } from '../config/firebase';
import { api } from '../utils/api';

interface AnalyticsData {
  userType?: 'expert' | 'client';
  totalEarnings?: number;
  totalSpent?: number;
  totalSessions: number;
  averageRating: number;
  totalReviews: number;
  chatSessions: number;
  callSessions: number;
  videoCallSessions?: number;
  completionRate: number;
  averageSessionDuration: number;
  weeklyEarnings?: number[];
  weeklySpending?: number[];
  topCategory?: string;
  walletBalance?: number;
  isOnline?: boolean;
}

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[Analytics] No authenticated user found');
      setIsLoading(false);
      return;
    }

    // Set loading to false on first data update
    let firstUpdate = true;

    // Subscribe to real-time analytics
    try {
      console.log('[Analytics] api object keys:', Object.keys(api));
      console.log('[Analytics] subscribeToAnalytics exists?', typeof (api as any).subscribeToAnalytics);
      
      if (typeof (api as any).subscribeToAnalytics !== 'function') {
        console.error('[Analytics] subscribeToAnalytics is not a function');
        setIsLoading(false);
        return;
      }

      const unsub = (api as any).subscribeToAnalytics(currentUser.uid, (data: any) => {
        console.log('[Analytics] Received data:', data);
        setAnalytics(data);
        if (firstUpdate) {
          setIsLoading(false);
          firstUpdate = false;
        }
      });

      // Cleanup subscription on component unmount
      return () => {
        if (unsub && typeof unsub === 'function') {
          unsub();
        }
      };
    } catch (error) {
      console.error('[Analytics] Error in useEffect:', error);
      setIsLoading(false);
      return;
    }
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          
          <View style={styles.metricsGrid}>
            {/* Total Earnings / Spending */}
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <DollarSign size={24} color="#059669" />
              </View>
              <Text style={styles.metricValue}>
                ₹{analytics?.userType === 'expert' 
                  ? (analytics?.totalEarnings || 0)?.toLocaleString() 
                  : (analytics?.totalSpent || 0)?.toLocaleString()}
              </Text>
              <Text style={styles.metricLabel}>
                {analytics?.userType === 'expert' ? 'Total Earnings' : 'Total Spent'}
              </Text>
            </View>

            {/* Total Sessions */}
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Users size={24} color="#2563EB" />
              </View>
              <Text style={styles.metricValue}>{analytics?.totalSessions || 0}</Text>
              <Text style={styles.metricLabel}>Sessions</Text>
            </View>

            {/* Average Rating */}
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Star size={24} color="#F59E0B" />
              </View>
              <Text style={styles.metricValue}>{analytics?.averageRating || 0}</Text>
              <Text style={styles.metricLabel}>Avg Rating</Text>
            </View>

            {/* Total Reviews / Wallet Balance */}
            <View style={styles.metricCard}>
              <View style={styles.metricIconContainer}>
                <Target size={24} color="#7C3AED" />
              </View>
              <Text style={styles.metricValue}>
                {analytics?.userType === 'expert' 
                  ? analytics?.totalReviews || 0
                  : `₹${(analytics?.walletBalance || 0)?.toLocaleString()}`}
              </Text>
              <Text style={styles.metricLabel}>
                {analytics?.userType === 'expert' ? 'Reviews' : 'Wallet Balance'}
              </Text>
            </View>
          </View>
        </View>

        {/* Session Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Breakdown</Text>
          
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownChart}>
                <View 
                  style={[
                    styles.chartSegment, 
                    { 
                      backgroundColor: '#2563EB', 
                      width: `${analytics?.callSessions ? (analytics.callSessions / (analytics.callSessions + (analytics?.chatSessions || 0)) * 100) : 0}%` 
                    }
                  ]} 
                />
                <View 
                  style={[
                    styles.chartSegment, 
                    { 
                      backgroundColor: '#059669', 
                      width: `${analytics?.chatSessions ? (analytics.chatSessions / (analytics.callSessions + (analytics?.chatSessions || 0)) * 100) : 0}%` 
                    }
                  ]} 
                />
              </View>
              <View style={styles.breakdownLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                  <Text style={styles.legendText}>
                    {analytics?.userType === 'expert' ? 'Calls' : 'Video Calls'}: {analytics?.callSessions || 0}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
                  <Text style={styles.legendText}>Audio: {analytics?.chatSessions || 0}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <View style={styles.performanceLabel}>
                <Clock size={20} color="#2563EB" />
                <Text style={styles.performanceText}>Avg Session Duration</Text>
              </View>
              <Text style={styles.performanceValue}>{analytics?.averageSessionDuration || 0} min</Text>
            </View>
          </View>

          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <View style={styles.performanceLabel}>
                <TrendingUp size={20} color="#059669" />
                <Text style={styles.performanceText}>Completion Rate</Text>
              </View>
              <Text style={styles.performanceValue}>{analytics?.completionRate || 0}%</Text>
            </View>
          </View>

          {analytics?.userType === 'expert' && (
            <View style={styles.performanceCard}>
              <View style={styles.performanceRow}>
                <View style={styles.performanceLabel}>
                  <BarChart3 size={20} color="#F59E0B" />
                  <Text style={styles.performanceText}>Expertise</Text>
                </View>
                <Text style={styles.performanceValue}>{analytics?.topCategory}</Text>
              </View>
            </View>
          )}

          {analytics?.userType === 'client' && (
            <View style={styles.performanceCard}>
              <View style={styles.performanceRow}>
                <View style={styles.performanceLabel}>
                  <BarChart3 size={20} color="#F59E0B" />
                  <Text style={styles.performanceText}>Most Visited</Text>
                </View>
                <Text style={styles.performanceValue}>{analytics?.topCategory || 'General'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Weekly Earnings / Spending Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {analytics?.userType === 'expert' ? 'Weekly Earnings' : 'Weekly Spending'}
          </Text>
          
          <View style={styles.chartContainer}>
            <View style={styles.weeklyChart}>
              {(analytics?.userType === 'expert' ? analytics?.weeklyEarnings : analytics?.weeklySpending)?.map((amount, index) => {
                const data = analytics?.userType === 'expert' ? analytics?.weeklyEarnings : analytics?.weeklySpending;
                const maxAmount = Math.max(...(data || []));
                const height = maxAmount > 0 ? (amount / maxAmount) * 120 : 0;
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                
                return (
                  <View key={index} style={styles.barWrapper}>
                    <View style={[styles.bar, { height }]} />
                    <Text style={styles.dayLabel}>{days[index]}</Text>
                    <Text style={styles.barValue}>₹{amount}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/my-sessions')}
          >
            <Users size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {analytics?.userType === 'expert' ? 'View Sessions' : 'Session History'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#059669' }]}
            onPress={() => router.push(analytics?.userType === 'expert' ? '/wallet' : '/wallet-topup')}
          >
            <DollarSign size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {analytics?.userType === 'expert' ? 'Withdraw Earnings' : 'Top-up Wallet'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  breakdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownItem: {
    gap: 16,
  },
  breakdownChart: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  chartSegment: {
    height: '100%',
  },
  breakdownLegend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: '#374151',
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  performanceText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
  },
  barWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: 30,
    backgroundColor: '#2563EB',
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  barValue: {
    fontSize: 10,
    color: '#374151',
  },
  actionSection: {
    marginTop: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
