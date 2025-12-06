import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';

export default function TermsConditionsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <FileText size={48} color="#2563EB" />
        </View>

        <Text style={styles.lastUpdated}>Last updated: December 2, 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing and using Expert Connect, you accept and agree to be bound by the terms and
            provision of this agreement. If you do not agree to these terms, please do not use our service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Service Description</Text>
          <Text style={styles.sectionText}>
            Expert Connect is a platform that connects clients with experts for real-time consultation
            through chat and call services. We facilitate these connections but do not guarantee the
            quality or accuracy of advice provided by experts.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.sectionText}>
            You are responsible for maintaining the confidentiality of your account and password. You
            agree to accept responsibility for all activities that occur under your account. You must
            notify us immediately of any unauthorized use of your account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Payment Terms</Text>
          <Text style={styles.sectionText}>
            All sessions are charged per minute at rates set by individual experts. Payments must be
            made through our secure payment gateway. Refunds are subject to our refund policy and must
            be requested within 24 hours of the session.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Expert Responsibilities</Text>
          <Text style={styles.sectionText}>
            Experts must provide accurate information about their expertise and experience. They are
            responsible for maintaining professional conduct during sessions and must not share
            confidential information outside the platform.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Client Responsibilities</Text>
          <Text style={styles.sectionText}>
            Clients must treat experts with respect and professionalism. Any abusive or inappropriate
            behavior may result in account suspension or termination. Clients are responsible for the
            accuracy of information they provide.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Prohibited Activities</Text>
          <Text style={styles.sectionText}>
            Users must not: (a) use the service for illegal purposes, (b) attempt to gain unauthorized
            access to other accounts, (c) transmit malicious code or viruses, (d) harass or harm other
            users, or (e) misrepresent their identity or expertise.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
          <Text style={styles.sectionText}>
            All content on Expert Connect, including text, graphics, logos, and software, is the property
            of Expert Connect or its content suppliers and is protected by intellectual property laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            Expert Connect is not liable for any direct, indirect, incidental, special, or consequential
            damages resulting from the use or inability to use our service, including but not limited to
            damages for loss of profits, data, or other intangible losses.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Termination</Text>
          <Text style={styles.sectionText}>
            We reserve the right to terminate or suspend your account and access to the service at our
            sole discretion, without notice, for conduct that we believe violates these terms or is
            harmful to other users, us, or third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
          <Text style={styles.sectionText}>
            We reserve the right to modify these terms at any time. We will notify users of any material
            changes via email or through the platform. Continued use of the service after such changes
            constitutes acceptance of the new terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Information</Text>
          <Text style={styles.sectionText}>
            If you have any questions about these Terms & Conditions, please contact us at:
            {'\n\n'}
            Email: support@expertconnect.com
            {'\n'}
            Phone: +91 123-456-7890
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Expert Connect, you acknowledge that you have read, understood, and agree to be
            bound by these Terms & Conditions.
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
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    lineHeight: 20,
    textAlign: 'center',
  },
});
