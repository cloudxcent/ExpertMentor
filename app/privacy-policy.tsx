import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Shield size={48} color="#10B981" />
        </View>

        <Text style={styles.lastUpdated}>Last updated: December 2, 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect information that you provide directly to us, including:
            {'\n\n'}
            • Personal information (name, email, phone number)
            {'\n'}
            • Profile information (expertise, experience, bio)
            {'\n'}
            • Payment information (securely processed through third-party providers)
            {'\n'}
            • Session data (chat logs, call recordings for quality purposes)
            {'\n'}
            • Usage information (app interactions, preferences)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use the information we collect to:
            {'\n\n'}
            • Provide and improve our services
            {'\n'}
            • Process payments and transactions
            {'\n'}
            • Send notifications and updates
            {'\n'}
            • Maintain security and prevent fraud
            {'\n'}
            • Analyze usage patterns and improve user experience
            {'\n'}
            • Comply with legal obligations
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell your personal information. We may share your information with:
            {'\n\n'}
            • Other users (as necessary for service provision)
            {'\n'}
            • Service providers (payment processors, hosting services)
            {'\n'}
            • Legal authorities (when required by law)
            {'\n'}
            • Business partners (with your consent)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.sectionText}>
            We implement appropriate technical and organizational measures to protect your personal
            information, including:
            {'\n\n'}
            • Encryption of data in transit and at rest
            {'\n'}
            • Regular security assessments
            {'\n'}
            • Access controls and authentication
            {'\n'}
            • Secure data centers and backup systems
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to:
            {'\n\n'}
            • Access your personal information
            {'\n'}
            • Correct inaccurate information
            {'\n'}
            • Request deletion of your data
            {'\n'}
            • Object to data processing
            {'\n'}
            • Export your data
            {'\n'}
            • Withdraw consent at any time
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Cookies and Tracking</Text>
          <Text style={styles.sectionText}>
            We use cookies and similar tracking technologies to:
            {'\n\n'}
            • Remember your preferences
            {'\n'}
            • Analyze app usage and performance
            {'\n'}
            • Provide personalized content
            {'\n'}
            • Ensure security and prevent fraud
            {'\n\n'}
            You can control cookie preferences through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Data Retention</Text>
          <Text style={styles.sectionText}>
            We retain your personal information for as long as necessary to provide our services and
            comply with legal obligations. Session data may be retained for up to 2 years for quality
            assurance and dispute resolution purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
          <Text style={styles.sectionText}>
            Our service is not intended for users under 18 years of age. We do not knowingly collect
            personal information from children. If we discover that we have collected information from
            a child, we will promptly delete it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
          <Text style={styles.sectionText}>
            Your information may be transferred to and processed in countries other than your country
            of residence. We ensure appropriate safeguards are in place to protect your information
            in accordance with this privacy policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Changes to Privacy Policy</Text>
          <Text style={styles.sectionText}>
            We may update this privacy policy from time to time. We will notify you of any material
            changes by posting the new policy on this page and updating the "Last updated" date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have questions about this privacy policy or our data practices, please contact us at:
            {'\n\n'}
            Email: privacy@expertconnect.com
            {'\n'}
            Phone: +91 123-456-7890
            {'\n'}
            Address: 123 Tech Park, Bangalore, India
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            We are committed to protecting your privacy and ensuring the security of your personal
            information. Your trust is important to us.
          </Text>
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
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 22,
  },
  footer: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    lineHeight: 20,
    textAlign: 'center',
  },
});
