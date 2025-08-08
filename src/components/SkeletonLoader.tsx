import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { COLORS, SPACING } from '../constants';
import { MATERIAL_EASING, ANIMATION_TIMINGS } from '../config/animationConfig';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animated = true,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: ANIMATION_TIMINGS.SKELETON_SHIMMER,
        easing: MATERIAL_EASING.standard,
        useNativeDriver: true,
      })
    );

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
    };
  }, [animated]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      {animated && (
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      )}
    </View>
  );
};

interface SkeletonCardProps {
  style?: ViewStyle;
  showAvatar?: boolean;
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  style,
  showAvatar = true,
  lines = 3,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        {showAvatar && (
          <SkeletonLoader
            width={40}
            height={40}
            borderRadius={20}
            style={styles.avatar}
          />
        )}
        <View style={styles.cardContent}>
          <SkeletonLoader width="70%" height={16} style={styles.title} />
          <SkeletonLoader width="50%" height={12} style={styles.subtitle} />
        </View>
      </View>
      
      <View style={styles.cardBody}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLoader
            key={index}
            width={index === lines - 1 ? '60%' : '100%'}
            height={12}
            style={styles.line}
          />
        ))}
      </View>
    </View>
  );
};

interface SkeletonListProps {
  itemCount?: number;
  showAvatar?: boolean;
  style?: ViewStyle;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  itemCount = 5,
  showAvatar = true,
  style,
}) => {
  return (
    <View style={[styles.list, style]}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <SkeletonCard
          key={index}
          showAvatar={showAvatar}
          style={StyleSheet.flatten([styles.listItem, { opacity: 1 - (index * 0.1) }])}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0', // Light gray color since COLORS.LIGHT_GRAY doesn't exist
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 100,
  },
  card: {
    backgroundColor: COLORS.LIGHT,
    borderRadius: 8,
    padding: SPACING.MD,
    marginVertical: SPACING.XS,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  avatar: {
    marginRight: SPACING.SM,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    marginBottom: SPACING.XS,
  },
  subtitle: {
    marginBottom: 0,
  },
  cardBody: {
    marginTop: SPACING.XS,
  },
  line: {
    marginBottom: SPACING.XS,
  },
  list: {
    padding: SPACING.SM,
  },
  listItem: {
    marginBottom: SPACING.SM,
  },
});