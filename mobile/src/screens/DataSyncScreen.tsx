import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://your-server.com:5000'; // TODO: Update with your server URL

interface SyncStatus {
  job_id: string;
  status: 'queued' | 'started' | 'finished' | 'failed';
  progress: number;
  message: string;
  files_found: number;
  result?: {
    files_discovered: number;
    files_downloaded: number;
    files_processed: number;
    vehicles_imported: number;
  };
}

export default function DataSyncScreen({ navigation }: any) {
  const [personalKey, setPersonalKey] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const { user } = useAuthStore();

  // Poll for status updates
  useEffect(() => {
    if (!jobId || !syncing) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sync/status/${jobId}`);
        const data: SyncStatus = await response.json();

        setStatus(data);

        if (data.status === 'finished') {
          clearInterval(interval);
          setSyncing(false);
          handleSyncComplete(data);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setSyncing(false);
          Alert.alert('Sync Failed', 'There was an error syncing your data. Please try again.');
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobId, syncing]);

  const handleStartSync = async () => {
    // Validate personal key
    if (personalKey.length !== 6) {
      Alert.alert('Invalid Key', 'Personal key must be exactly 6 digits');
      return;
    }

    if (!personalKey.match(/^\d{6}$/)) {
      Alert.alert('Invalid Key', 'Personal key must contain only numbers');
      return;
    }

    setSyncing(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mechanic_id: user?.id || 'test_user',
          personal_key: personalKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      const data = await response.json();
      setJobId(data.job_id);
      setStatus({
        job_id: data.job_id,
        status: 'queued',
        progress: 0,
        message: data.message,
        files_found: 0,
      });

    } catch (error) {
      console.error('Error starting sync:', error);
      Alert.alert('Connection Error', 'Could not connect to sync server. Please try again.');
      setSyncing(false);
    }
  };

  const handleSyncComplete = (finalStatus: SyncStatus) => {
    const result = finalStatus.result;

    if (result) {
      Alert.alert(
        'Sync Complete! 🎉',
        `Successfully imported ${result.vehicles_imported} vehicles from ${result.files_processed} files.\n\nYour data is now available in the app.`,
        [
          {
            text: 'View Vehicles',
            onPress: () => navigation.navigate('Dashboard'),
          },
          { text: 'OK' },
        ]
      );
    }

    // Reset for next sync
    setPersonalKey('');
  };

  const handleCancel = () => {
    if (jobId) {
      fetch(`${API_BASE_URL}/api/sync/cancel/${jobId}`, { method: 'POST' })
        .catch(err => console.error('Error cancelling:', err));
    }

    setSyncing(false);
    setJobId(null);
    setStatus(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="cloud-download-outline" size={64} color="#3B82F6" />
          <Text style={styles.title}>Sync Your Data</Text>
          <Text style={styles.subtitle}>
            Automatically import your diagnostic files from your shop computer
          </Text>
        </View>

        {!syncing ? (
          <>
            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>How it works:</Text>
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  Open RemotePC on your shop computer
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  Find your 6-digit Personal Key in RemotePC
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>
                  Enter the key below and tap "Start Sync"
                </Text>
              </View>
              <View style={styles.instructionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepText}>
                  Wait while we import your files (usually 2-5 minutes)
                </Text>
              </View>
            </View>

            {/* Input */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>RemotePC Personal Key</Text>
              <TextInput
                style={styles.input}
                value={personalKey}
                onChangeText={setPersonalKey}
                placeholder="123456"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Text style={styles.inputHint}>
                Enter the 6-digit code shown in RemotePC
              </Text>
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={[
                styles.startButton,
                personalKey.length !== 6 && styles.startButtonDisabled,
              ]}
              onPress={handleStartSync}
              disabled={personalKey.length !== 6}
            >
              <Ionicons name="sync" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Start Sync</Text>
            </TouchableOpacity>

            {/* Help Link */}
            <TouchableOpacity style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.helpButtonText}>
                Where do I find my Personal Key?
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Syncing Progress */}
            <View style={styles.progressCard}>
              <ActivityIndicator size="large" color="#3B82F6" />

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${status?.progress || 0}%` },
                  ]}
                />
              </View>

              <Text style={styles.progressText}>
                {status?.progress || 0}%
              </Text>

              <Text style={styles.progressMessage}>
                {status?.message || 'Preparing to sync...'}
              </Text>

              {status && status.files_found > 0 && (
                <Text style={styles.filesFoundText}>
                  📁 Found {status.files_found} files
                </Text>
              )}

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Status Details */}
            <View style={styles.statusDetails}>
              <Text style={styles.statusDetailsTitle}>Sync Details</Text>
              <View style={styles.statusDetailRow}>
                <Text style={styles.statusDetailLabel}>Job ID:</Text>
                <Text style={styles.statusDetailValue}>{jobId?.slice(0, 8)}...</Text>
              </View>
              <View style={styles.statusDetailRow}>
                <Text style={styles.statusDetailLabel}>Status:</Text>
                <Text style={styles.statusDetailValue}>
                  {status?.status || 'queued'}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginTop: 3,
  },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#111827',
  },
  inputHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  helpButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    marginLeft: 6,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  progressMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  filesFoundText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 12,
  },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  statusDetails: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statusDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
});
