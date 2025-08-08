import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  IconButton,
  Chip,
} from 'react-native-paper';
import { COLORS } from '../constants';
import { UpdateInfo } from '../services/updateService';

interface UpdateNotificationProps {
  update: UpdateInfo | null;
  visible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  onViewDetails: () => void;
}

const { width } = Dimensions.get('window');

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  update,
  visible,
  onUpdate,
  onDismiss,
  onViewDetails,
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible && update) {
      // Slide in from top
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out to top
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, update]);

  if (!update || !visible) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <Card style={[styles.card, update.critical && styles.criticalCard]}>
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Title style={[styles.title, update.critical && styles.criticalTitle]}>
                Update Available
              </Title>
              <View style={styles.chipContainer}>
                {update.critical && (
                  <Chip
                    icon="alert"
                    mode="flat"
                    style={styles.criticalChip}
                    textStyle={styles.criticalChipText}
                  >
                    Critical
                  </Chip>
                )}
                <Chip icon="download" mode="outlined" style={styles.sizeChip}>
                  {formatFileSize(update.size)}
                </Chip>
              </View>
            </View>
            <IconButton
              icon="close"
              size={20}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>

          <Paragraph style={styles.description}>
            {update.component.charAt(0).toUpperCase() + update.component.slice(1)} v{update.version}
          </Paragraph>

          <Paragraph style={styles.updateDescription} numberOfLines={2}>
            {update.description}
          </Paragraph>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onViewDetails}
              style={styles.detailsButton}
              compact
            >
              Details
            </Button>
            <Button
              mode="contained"
              onPress={onUpdate}
              style={[styles.updateButton, update.critical && styles.criticalUpdateButton]}
              compact
            >
              {update.critical ? 'Install Now' : 'Update'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 10,
  },
  card: {
    backgroundColor: COLORS.LIGHT,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  criticalCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.ERROR,
  },
  content: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.PRIMARY,
  },
  criticalTitle: {
    color: COLORS.ERROR,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  criticalChip: {
    backgroundColor: COLORS.ERROR,
    height: 24,
  },
  criticalChipText: {
    color: COLORS.LIGHT,
    fontSize: 10,
  },
  sizeChip: {
    borderColor: COLORS.PRIMARY,
    height: 24,
  },
  closeButton: {
    margin: 0,
    marginTop: -8,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: COLORS.TEXT_PRIMARY,
  },
  updateDescription: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  detailsButton: {
    borderColor: COLORS.PRIMARY,
  },
  updateButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  criticalUpdateButton: {
    backgroundColor: COLORS.ERROR,
  },
});

export default UpdateNotification;