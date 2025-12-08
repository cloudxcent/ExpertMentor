import { View, Text, StyleSheet } from 'react-native';

export default function CallScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call Screen</Text>
      <Text style={styles.subtitle}>Select an expert to start calling</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
});
