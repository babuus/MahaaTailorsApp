import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { testApiConnectivity, pingApi } from '../utils/apiTest';
import { ENV_CONFIG } from '../config/environment';

const ApiDebugScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    try {
      const results = await testApiConnectivity();
      setTestResults(results);
    } catch (error: any) {
      Alert.alert('Test Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const runPingTest = async () => {
    setIsLoading(true);
    try {
      const result = await pingApi();
      Alert.alert(
        'Ping Test Result',
        result.success 
          ? `Success! Got ${Array.isArray(result.data) ? result.data.length : 'some'} items`
          : `Failed: ${result.error}`
      );
    } catch (error: any) {
      Alert.alert('Ping Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>API Debug Screen</Text>
      
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Configuration</Text>
        <Text style={styles.configText}>Environment: {ENV_CONFIG.ENVIRONMENT}</Text>
        <Text style={styles.configText}>API URL: {ENV_CONFIG.API_BASE_URL}</Text>
        <Text style={styles.configText}>Timeout: {ENV_CONFIG.TIMEOUT}ms</Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={runPingTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Run Ping Test'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={runTests}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Run Full API Tests'}
          </Text>
        </TouchableOpacity>
      </View>

      {testResults.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={[
                styles.resultTitle,
                { color: result.success ? '#4CAF50' : '#F44336' }
              ]}>
                {result.success ? '✅' : '❌'} {result.test}
              </Text>
              
              {result.success ? (
                <View>
                  <Text style={styles.resultText}>Status: {result.status}</Text>
                  <Text style={styles.resultText}>Response Time: {result.responseTime}ms</Text>
                  <Text style={styles.resultText}>Data Length: {result.dataLength} chars</Text>
                  <Text style={styles.resultText}>
                    Data Preview: {JSON.stringify(result.data).substring(0, 100)}...
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.errorText}>Error: {result.error}</Text>
                  {result.status && <Text style={styles.errorText}>Status: {result.status}</Text>}
                  {result.responseData && (
                    <Text style={styles.errorText}>
                      Response: {JSON.stringify(result.responseData)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  configSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  configText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonSection: {
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  resultItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    marginBottom: 2,
    color: '#666',
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: 12,
    marginBottom: 2,
    color: '#F44336',
    fontFamily: 'monospace',
  },
});

export default ApiDebugScreen;