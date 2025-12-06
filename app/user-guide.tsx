import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, BookOpen, Search, MessageCircle, Phone, Wallet, Star, Settings, UserCircle } from 'lucide-react-native';

export default function UserGuideScreen() {
  const GuideSection = ({
    icon,
    title,
    steps,
  }: {
    icon: React.ReactNode;
    title: string;
    steps: string[];
  }) => (
    <View style={styles.guideSection}>
      <View style={styles.guideSectionHeader}>
        <View style={styles.guideSectionIcon}>{icon}</View>
        <Text style={styles.guideSectionTitle}>{title}</Text>
      </View>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <BookOpen size={48} color="#2563EB" />
          <Text style={styles.welcomeTitle}>Welcome to Expert Connect!</Text>
          <Text style={styles.welcomeText}>
            This guide will help you get started with connecting to experts and making the most of our
            platform.
          </Text>
        </View>

        <GuideSection
          icon={<UserCircle size={24} color="#2563EB" />}
          title="Getting Started"
          steps={[
            'Create an account by signing up with your phone number',
            'Choose your role: Expert or Client',
            'Complete your profile with relevant information',
            'Add a profile photo to build trust',
            'Set up your payment methods for seamless transactions',
          ]}
        />

        <GuideSection
          icon={<Search size={24} color="#059669" />}
          title="Finding Experts"
          steps={[
            'Browse the home screen to see featured experts',
            'Use the search tab to find experts by name or expertise',
            'Filter results based on ratings, rates, and availability',
            'View expert profiles to check experience and reviews',
            'Check their chat and call rates before connecting',
          ]}
        />

        <GuideSection
          icon={<MessageCircle size={24} color="#7C3AED" />}
          title="Starting a Chat Session"
          steps={[
            'Navigate to an expert\'s profile',
            'Tap the "Start Chat" button',
            'Ensure you have sufficient wallet balance',
            'Chat will start and charges apply per minute',
            'End the session when you\'re done to stop charges',
          ]}
        />

        <GuideSection
          icon={<Phone size={24} color="#DC2626" />}
          title="Making a Call"
          steps={[
            'Go to the expert\'s profile page',
            'Tap the "Start Call" button',
            'Verify your wallet has enough balance',
            'Wait for the expert to accept the call',
            'Enjoy your consultation and end when finished',
          ]}
        />

        <GuideSection
          icon={<Wallet size={24} color="#F59E0B" />}
          title="Managing Your Wallet"
          steps={[
            'Go to Profile > My Wallet',
            'Tap "Add Money" to top up your balance',
            'Enter amount and choose payment method',
            'Complete payment through secure gateway',
            'Withdraw earnings to your bank account (for experts)',
          ]}
        />

        <GuideSection
          icon={<Star size={24} color="#F59E0B" />}
          title="Reviews & Ratings"
          steps={[
            'After each session, you\'ll be prompted to rate',
            'Provide a rating from 1 to 5 stars',
            'Write a detailed review (optional)',
            'Submit to help other users make informed decisions',
            'View your received reviews in the Reviews section',
          ]}
        />

        <GuideSection
          icon={<Settings size={24} color="#6B7280" />}
          title="Account Settings"
          steps={[
            'Access Settings from your profile',
            'Update your personal information',
            'Manage notification preferences',
            'Change your password regularly',
            'Enable two-factor authentication for security',
          ]}
        />

        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              💡 Keep your profile updated with accurate information to attract more clients
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              💡 Maintain sufficient wallet balance to avoid session interruptions
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              💡 Leave honest reviews to help build a trustworthy community
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              💡 Contact support if you face any issues or have questions
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Need More Help?</Text>
          <Text style={styles.footerText}>
            Contact our support team anytime for assistance
          </Text>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => router.push('/help-support')}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 16,
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  guideSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  guideSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  guideSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guideSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    flex: 1,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
  },
  tipsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  footerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  supportButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
