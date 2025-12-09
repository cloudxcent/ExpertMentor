import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Mail, ArrowRight, Loader, Phone } from 'lucide-react-native';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential, RecaptchaVerifier } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { storage, StorageKeys } from '../../utils/storage';
import { signInWithGoogle, handleGoogleAuthSuccess } from '../../utils/googleAuth';

type AuthMethod = 'initial' | 'email' | 'phone' | 'otp';

export default function LoginScreen() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const recaptchaVerifierRef = React.useRef<RecaptchaVerifier | null>(null);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let user;
      if (isSignUp) {
        console.log('[Login] Creating user with Firebase...');
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
        console.log('[Login] User created:', user.uid);
      } else {
        console.log('[Login] Signing in user with Firebase...');
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
        console.log('[Login] User signed in:', user.uid);
      }

      if (user) {
        await handleSuccessfulAuth(user.uid, user.email || '');
      }
    } catch (err: any) {
      let errorMessage = 'Authentication failed';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Please sign in.';
        setIsSignUp(false);
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please sign up.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Use at least 6 characters.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      console.log('[Login] Starting Google Sign-In...');
      const result = await signInWithGoogle();

      if (result.success && result.user) {
        console.log('[Login] Google auth successful, handling profile...');
        // Determine user type - for now, default to client, can be changed in profile
        const authResult = await handleGoogleAuthSuccess(result.user, 'client');

        if (authResult.success) {
          console.log('[Login] User profile created/updated, navigating to user-type-selection');
          router.replace('/(auth)/user-type-selection');
        } else {
          setError(authResult.error || 'Failed to create user profile');
          console.error('[Login] Profile creation failed:', authResult.error);
        }
      } else {
        setError(result.error || 'Google Sign-In failed');
        console.error('[Login] Google Sign-In failed:', result.error);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Google Sign-In failed';
      setError(errorMessage);
      console.error('[Login] Google Sign-In error:', err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSuccessfulAuth = async (userId: string, userEmail: string) => {
    try {
      console.log('[Login] Checking profile in Firestore...');
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        console.log('[Login] Profile found, navigating to tabs');
        const profile = profileSnap.data();
        await storage.setItem(StorageKeys.USER_PROFILE, { id: userId, email: userEmail, ...profile });
        await storage.setItem(StorageKeys.IS_LOGGED_IN, true);
        router.replace('/(tabs)');
      } else {
        console.log('[Login] Profile not found, navigating to user-type-selection');
        // Create initial profile document
        await setDoc(profileRef, {
          email: userEmail,
          createdAt: new Date().toISOString(),
        });
        router.replace('/(auth)/user-type-selection');
      }
    } catch (err) {
      console.error('Profile check error:', err);
      router.replace('/(auth)/user-type-selection');
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('[Login] Sending OTP to phone number:', phoneNumber);

      // Format phone number with country code
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('+')) {
        const cleanedPhone = cleanPhone.slice(-10); // Get last 10 digits
        formattedPhone = '+91' + cleanedPhone; // Default to India (+91)
      }

      console.log('[Login] Formatted phone:', formattedPhone);

      // Set up reCAPTCHA verifier for web
      if (Platform.OS === 'web' && !recaptchaVerifierRef.current) {
        console.log('[Login] Setting up reCAPTCHA verifier for web');
        try {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
          });
        } catch (err) {
          console.warn('[Login] reCAPTCHA container not found, proceeding without it');
        }
      }

      // Send OTP
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current || undefined
      );

      setVerificationId(confirmationResult.verificationId);
      setAuthMethod('otp');
      console.log('[Login] OTP sent successfully, verification ID:', confirmationResult.verificationId);
    } catch (err: any) {
      console.error('[Login] Error sending OTP:', err);
      let errorMessage = 'Failed to send OTP';

      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please use format: +91 XXXXX XXXXX';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (err.code === 'auth/billing-not-enabled') {
        errorMessage = 'Phone authentication is not available. Please contact support or enable billing in Firebase console.';
      } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
        errorMessage = 'Phone OTP works best on mobile devices. Please use Gmail or Email login on web.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (!verificationId) {
      setError('Verification ID not found. Please try sending OTP again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('[Login] Verifying OTP...');
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      console.log('[Login] OTP verified successfully, user ID:', user.uid);
      await handleSuccessfulAuth(user.uid, user.phoneNumber || '');
    } catch (err: any) {
      console.error('[Login] Error verifying OTP:', err);
      let errorMessage = 'Invalid OTP';

      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP code. Please check and try again.';
      } else if (err.code === 'auth/code-expired') {
        errorMessage = 'OTP code has expired. Please request a new one.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInitialScreen = () => (
    <View style={styles.content}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/Logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Connect with experts or share your expertise</Text>
      </View>

      <View style={styles.authOptions}>
        <TouchableOpacity
          style={styles.authButton}
          onPress={handleGoogleLogin}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator size="small" color="#EA4335" />
          ) : (
            <View style={styles.gmailIconContainer}>
              <Text style={styles.gmailIcon}>G</Text>
            </View>
          )}
          <Text style={styles.authButtonText}>
            {isGoogleLoading ? 'Signing in...' : 'Continue with Gmail'}
          </Text>
          <ArrowRight size={20} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.authButton}
          onPress={() => setAuthMethod('phone')}
        >
          <Phone size={24} color="#10B981" />
          <Text style={styles.authButtonText}>Continue with Phone</Text>
          <ArrowRight size={20} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.authButton}
          onPress={() => setAuthMethod('email')}
        >
          <Mail size={24} color="#2563EB" />
          <Text style={styles.authButtonText}>Continue with Email</Text>
          <ArrowRight size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );

  const renderEmailAuth = () => (
    <View style={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setAuthMethod('initial');
          setError('');
          setEmail('');
          setPassword('');
        }}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Sign up with your email' : 'Sign in to your account'}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Mail size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            placeholder="Password (min 6 characters)"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleEmailAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        {!isSignUp && (
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => {
              console.log('[Login] Forgot password clicked');
              router.push('/(auth)/forgot-password');
            }}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
        >
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.switchTextBold}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPhoneAuth = () => (
    <View style={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setAuthMethod('initial');
          setError('');
          setPhoneNumber('');
          setOtp('');
          setVerificationId(null);
        }}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Login with Phone</Text>
        <Text style={styles.subtitle}>Enter your phone number to receive an OTP</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Phone size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              setError('');
            }}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSendOTP}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Recaptcha container for web */}
      {Platform.OS === 'web' && <View id="recaptcha-container" />}
    </View>
  );

  const renderOTPAuth = () => (
    <View style={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setAuthMethod('phone');
          setError('');
          setOtp('');
        }}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {phoneNumber}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={(text) => {
              setOtp(text.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={handleSendOTP}
          disabled={isLoading}
        >
          <Text style={styles.switchText}>
            Didn't receive the code? 
            <Text style={styles.switchTextBold}> Resend</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <LinearGradient colors={['#EBF4FF', '#FFFFFF']} style={styles.gradient}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {authMethod === 'initial' && renderInitialScreen()}
            {authMethod === 'email' && renderEmailAuth()}
            {authMethod === 'phone' && renderPhoneAuth()}
            {authMethod === 'otp' && renderOTPAuth()}
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    minHeight: 600,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  logoIcon: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  logoText: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 0,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  authOptions: {
    gap: 16,
    marginBottom: 32,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  gmailIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gmailIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA4335',
  },
  gmailIcon: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  googleIcon: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    width: 24,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  authButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    marginBottom: 24,
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginBottom: 16,
    marginTop: -8,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  switchTextBold: {
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
