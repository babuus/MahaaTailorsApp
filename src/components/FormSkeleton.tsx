import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SkeletonLoader } from './SkeletonLoader';
import { SPACING } from '../constants';

interface FormSkeletonProps {
  style?: ViewStyle;
  fieldCount?: number;
  showTitle?: boolean;
  showButtons?: boolean;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  style,
  fieldCount = 5,
  showTitle = true,
  showButtons = true,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Form Title Skeleton */}
      {showTitle && (
        <SkeletonLoader 
          width="60%" 
          height={24} 
          style={styles.title} 
        />
      )}

      {/* Form Fields Skeleton */}
      {Array.from({ length: fieldCount }).map((_, index) => (
        <View key={index} style={styles.fieldContainer}>
          {/* Field Label */}
          <SkeletonLoader 
            width="40%" 
            height={14} 
            style={styles.fieldLabel} 
          />
          
          {/* Field Input */}
          <SkeletonLoader 
            width="100%" 
            height={48} 
            borderRadius={8}
            style={styles.fieldInput} 
          />
        </View>
      ))}

      {/* Action Buttons Skeleton */}
      {showButtons && (
        <View style={styles.buttonContainer}>
          <SkeletonLoader 
            width="45%" 
            height={48} 
            borderRadius={8}
            style={styles.button} 
          />
          <SkeletonLoader 
            width="45%" 
            height={48} 
            borderRadius={8}
            style={styles.button} 
          />
        </View>
      )}
    </View>
  );
};

interface MeasurementFormSkeletonProps {
  style?: ViewStyle;
}

export const MeasurementFormSkeleton: React.FC<MeasurementFormSkeletonProps> = ({
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Garment Type Selector Skeleton */}
      <View style={styles.fieldContainer}>
        <SkeletonLoader width="50%" height={14} style={styles.fieldLabel} />
        <SkeletonLoader width="100%" height={48} borderRadius={8} style={styles.fieldInput} />
      </View>

      {/* Measurement Fields Grid Skeleton */}
      <View style={styles.measurementGrid}>
        {Array.from({ length: 8 }).map((_, index) => (
          <View key={index} style={styles.measurementField}>
            <SkeletonLoader width="80%" height={12} style={styles.measurementLabel} />
            <SkeletonLoader width="100%" height={40} borderRadius={6} style={styles.measurementInput} />
          </View>
        ))}
      </View>

      {/* Notes Section Skeleton */}
      <View style={styles.fieldContainer}>
        <SkeletonLoader width="30%" height={14} style={styles.fieldLabel} />
        <SkeletonLoader width="100%" height={80} borderRadius={8} style={styles.fieldInput} />
      </View>

      {/* Save Button Skeleton */}
      <SkeletonLoader width="100%" height={48} borderRadius={8} style={styles.saveButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.MD,
  },
  title: {
    marginBottom: SPACING.LG,
    alignSelf: 'center',
  },
  fieldContainer: {
    marginBottom: SPACING.MD,
  },
  fieldLabel: {
    marginBottom: SPACING.XS,
  },
  fieldInput: {
    marginBottom: SPACING.XS,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.LG,
  },
  button: {
    marginHorizontal: SPACING.XS,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  measurementField: {
    width: '48%',
    marginBottom: SPACING.MD,
  },
  measurementLabel: {
    marginBottom: SPACING.XS,
  },
  measurementInput: {
    marginBottom: 0,
  },
  saveButton: {
    marginTop: SPACING.MD,
  },
});