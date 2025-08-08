import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import { MaterialIcon } from './';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';

interface ThumbFriendlyFormProps {
  children: React.ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  showNavigation?: boolean;
  currentStep?: number;
  totalSteps?: number;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

const ThumbFriendlyForm: React.FC<ThumbFriendlyFormProps> = ({
  children,
  onSave,
  onCancel,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  showNavigation = false,
  currentStep = 1,
  totalSteps = 1,
  onNextStep,
  onPrevStep,
}) => {
  const { isDarkMode } = useThemeContext();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const screenHeight = Dimensions.get('window').height;

  const containerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const toolbarStyle = {
    backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
    borderTopColor: isDarkMode ? '#555555' : '#E0E0E0',
  };

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(scrollY > screenHeight * 0.5);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {children}
        
        {/* Bottom spacing for toolbar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating scroll to top button */}
      {showScrollToTop && (
        <TouchableOpacity
          style={[styles.scrollToTopButton, { backgroundColor: COLORS.PRIMARY }]}
          onPress={scrollToTop}
          accessibilityLabel="Scroll to top"
        >
          <MaterialIcon name="keyboard-arrow-up" size="md" color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Bottom toolbar */}
      <View style={[styles.toolbar, toolbarStyle]}>
        {showNavigation && totalSteps > 1 ? (
          // Step navigation mode
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentStep === 1 && styles.navButtonDisabled,
              ]}
              onPress={onPrevStep}
              disabled={currentStep === 1}
            >
              <MaterialIcon 
                name="keyboard-arrow-left" 
                size="md" 
                color={currentStep === 1 ? '#999999' : COLORS.PRIMARY} 
              />
              <Text style={[
                styles.navButtonText,
                { color: currentStep === 1 ? '#999999' : COLORS.PRIMARY }
              ]}>
                Back
              </Text>
            </TouchableOpacity>

            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>
                {currentStep} of {totalSteps}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.navButton,
                currentStep === totalSteps && styles.navButtonDisabled,
              ]}
              onPress={currentStep === totalSteps ? onSave : onNextStep}
              disabled={loading}
            >
              <Text style={[
                styles.navButtonText,
                { color: loading ? '#999999' : COLORS.PRIMARY }
              ]}>
                {currentStep === totalSteps ? saveLabel : 'Next'}
              </Text>
              <MaterialIcon 
                name={currentStep === totalSteps ? "check" : "keyboard-arrow-right"}
                size="md" 
                color={loading ? '#999999' : COLORS.PRIMARY} 
              />
            </TouchableOpacity>
          </View>
        ) : (
          // Standard save/cancel mode
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.saveButton,
                { backgroundColor: loading ? '#999999' : COLORS.PRIMARY }
              ]}
              onPress={onSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : saveLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
  },
  bottomSpacing: {
    height: 100, // Space for toolbar
  },
  scrollToTopButton: {
    position: 'absolute',
    right: SPACING.MD,
    bottom: 120, // Above toolbar
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    paddingBottom: SPACING.LG, // Extra padding for safe area
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.XS,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 20,
    minWidth: 80,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: SPACING.XS,
  },
  stepIndicator: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 16,
    backgroundColor: COLORS.BACKGROUND_SECONDARY,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
});

export default ThumbFriendlyForm;