// Enhanced Modal component with Material Design animations
import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
} from 'react-native';
import { useAnimations } from '../hooks/useAnimations';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { ANIMATION_TIMINGS, MATERIAL_EASING } from '../config/animationConfig';

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'slideFromBottom' | 'scaleIn' | 'fadeIn';
  backdropOpacity?: number;
  style?: any;
  contentStyle?: any;
}

const { height: screenHeight } = Dimensions.get('window');

const AnimatedModal: React.FC<AnimatedModalProps> = ({
  visible,
  onClose,
  children,
  animationType = 'slideFromBottom',
  backdropOpacity = 0.5,
  style,
  contentStyle,
}) => {
  const { isDarkMode } = useThemeContext();
  const [modalAnimation, modalControls] = useAnimations(0, {
    context: 'AnimatedModal',
    respectReducedMotion: true,
  });
  
  const backdropOpacityValue = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  // Animate modal entrance
  useEffect(() => {
    if (visible && !isAnimating.current) {
      isAnimating.current = true;
      
      // Set initial values based on animation type
      switch (animationType) {
        case 'slideFromBottom':
          modalAnimation.setValue(screenHeight);
          break;
        case 'scaleIn':
          modalAnimation.setValue(0.8);
          break;
        case 'fadeIn':
          modalAnimation.setValue(0);
          break;
      }
      
      // Animate backdrop
      Animated.timing(backdropOpacityValue, {
        toValue: backdropOpacity,
        duration: ANIMATION_TIMINGS.MODAL_PRESENT,
        easing: MATERIAL_EASING.decelerate,
        useNativeDriver: true,
      }).start();

      // Animate modal content
      const animateModal = async () => {
        try {
          switch (animationType) {
            case 'slideFromBottom':
              await modalControls.slideFromBottom({ duration: ANIMATION_TIMINGS.MODAL_PRESENT });
              break;
            case 'scaleIn':
              await modalControls.scaleIn({ duration: ANIMATION_TIMINGS.MODAL_PRESENT });
              break;
            case 'fadeIn':
              await modalControls.fadeIn({ duration: ANIMATION_TIMINGS.MODAL_PRESENT });
              break;
          }
        } catch (error) {
          console.error('Modal entrance animation failed:', error);
        } finally {
          isAnimating.current = false;
        }
      };

      animateModal();
    }
  }, [visible, animationType, modalAnimation, modalControls, backdropOpacityValue, backdropOpacity]);

  // Animate modal exit
  const handleClose = async () => {
    if (isAnimating.current) return;
    
    isAnimating.current = true;

    try {
      // Animate backdrop fade out
      const backdropFade = Animated.timing(backdropOpacityValue, {
        toValue: 0,
        duration: ANIMATION_TIMINGS.MODAL_PRESENT * 0.8,
        easing: MATERIAL_EASING.accelerate,
        useNativeDriver: true,
      });

      // Animate modal content exit
      let modalExit: Promise<void>;
      switch (animationType) {
        case 'slideFromBottom':
          modalAnimation.setValue(0);
          modalExit = new Promise((resolve) => {
            Animated.timing(modalAnimation, {
              toValue: screenHeight,
              duration: ANIMATION_TIMINGS.MODAL_PRESENT * 0.8,
              easing: MATERIAL_EASING.accelerate,
              useNativeDriver: true,
            }).start(() => resolve());
          });
          break;
        case 'scaleIn':
          modalAnimation.setValue(1);
          modalExit = new Promise((resolve) => {
            Animated.timing(modalAnimation, {
              toValue: 0.8,
              duration: ANIMATION_TIMINGS.MODAL_PRESENT * 0.8,
              easing: MATERIAL_EASING.accelerate,
              useNativeDriver: true,
            }).start(() => resolve());
          });
          break;
        case 'fadeIn':
          modalAnimation.setValue(1);
          modalExit = new Promise((resolve) => {
            Animated.timing(modalAnimation, {
              toValue: 0,
              duration: ANIMATION_TIMINGS.MODAL_PRESENT * 0.8,
              easing: MATERIAL_EASING.accelerate,
              useNativeDriver: true,
            }).start(() => resolve());
          });
          break;
        default:
          modalExit = Promise.resolve();
      }

      // Run animations in parallel
      await Promise.all([
        new Promise<void>((resolve) => backdropFade.start(() => resolve())),
        modalExit,
      ]);

      onClose();
    } catch (error) {
      console.error('Modal exit animation failed:', error);
      onClose();
    } finally {
      isAnimating.current = false;
    }
  };

  // Get transform style based on animation type
  const getTransformStyle = () => {
    switch (animationType) {
      case 'slideFromBottom':
        return {
          transform: [
            {
              translateY: modalAnimation,
            },
          ],
        };
      case 'scaleIn':
        return {
          transform: [
            {
              scale: modalAnimation,
            },
          ],
        };
      case 'fadeIn':
        return {
          opacity: modalAnimation,
        };
      default:
        return {};
    }
  };

  const modalStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none" // We handle animations ourselves
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[styles.container, style]}>
        {/* Animated Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacityValue,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Animated Modal Content */}
        <Animated.View
          style={[
            styles.modalContent,
            modalStyle,
            getTransformStyle(),
            contentStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    maxWidth: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: SPACING.LG,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});

export default AnimatedModal;