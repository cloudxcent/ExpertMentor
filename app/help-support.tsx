import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, MessageCircle, Phone, FileText, HelpCircle, ChevronRight } from 'lucide-react-native';

export default function HelpSupportScreen() {
  const handleContact = (type: string) => {
    switch (type) {
      case 'email':
        Linking.openURL('mailto:support@expertconnect.com');
        break;
      case 'phone':
        Linking.openURL('tel:+911234567890');
        break;
      case 'chat':
        router.push('/live-chat');
        break;
    }
  };

  const ContactOption = ({
    icon,
    title,
    subtitle,
    onPress,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.contactCard} onPress={onPress}>
      <View style={styles.contactIcon}>{icon}</View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const FAQItem = ({ question, answer }: { question: string; answer: string }) => (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <ContactOption
            icon={<Mail size={24} color="#2563EB" />}
            title="Email Support"
            subtitle="support@expertconnect.com"
            onPress={() => handleContact('email')}
          />
          <ContactOption
            icon={<Phone size={24} color="#059669" />}
            title="Phone Support"
            subtitle="+91 123-456-7890"
            onPress={() => handleContact('phone')}
          />
          <ContactOption
            icon={<MessageCircle size={24} color="#7C3AED" />}
            title="Live Chat"
            subtitle="Chat with our support team"
            onPress={() => handleContact('chat')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => router.push('/terms-conditions')}
          >
            <View style={styles.resourceLeft}>
              <View style={styles.resourceIcon}>
                <FileText size={20} color="#F59E0B" />
              </View>
              <Text style={styles.resourceTitle}>Terms & Conditions</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => router.push('/privacy-policy')}
          >
            <View style={styles.resourceLeft}>
              <View style={styles.resourceIcon}>
                <FileText size={20} color="#DC2626" />
              </View>
              <Text style={styles.resourceTitle}>Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resourceItem}
            onPress={() => router.push('/user-guide')}
          >
            <View style={styles.resourceLeft}>
              <View style={styles.resourceIcon}>
                <HelpCircle size={20} color="#2563EB" />
              </View>
              <Text style={styles.resourceTitle}>User Guide</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <FAQItem
            question="How do I book a session with an expert?"
            answer="Browse experts on the home screen, tap on their profile, and click 'Start Chat' or 'Start Call' to book a session."
          />
          <FAQItem
            question="How do payments work?"
            answer="You're charged per minute for sessions. Add funds to your wallet or use saved payment methods for seamless transactions."
          />
          <FAQItem
            question="Can I cancel a session?"
            answer="Yes, you can cancel sessions before they start. Refund policies vary based on cancellation timing."
          />
          <FAQItem
            question="How do I become an expert?"
            answer="Sign up as an expert, complete your profile with expertise and rates, and start accepting session requests."
          />
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
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
});
