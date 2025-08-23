import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useThemeContext } from '../contexts/ThemeContext';
import MaterialIcon from './MaterialIcon';
import { getBillItemImages } from '../services/api';

interface BillItemImageGalleryProps {
  billId: string;
  itemId: string;
  itemName: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Individual image thumbnail component with error handling
interface ImageThumbnailProps {
  imageUrl: string;
  index: number;
  onPress: () => void;
  isDarkMode: boolean;
}

const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ imageUrl, index, onPress, isDarkMode }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.warn(`Failed to load image ${index + 1}: ${imageUrl}`);
  };

  const thumbnailStyles = createStyles(isDarkMode);

  return (
    <TouchableOpacity
      style={[
        thumbnailStyles.imageWrapper,
        imageError && thumbnailStyles.errorImageWrapper
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={imageError}
    >
      {imageError ? (
        <View style={thumbnailStyles.errorImageContainer}>
          <MaterialIcon name="error" size={24} color="#FF3B30" />
          <Text style={thumbnailStyles.errorImageText}>Failed to load</Text>
        </View>
      ) : (
        <>
          <Image 
            source={{ uri: imageUrl }} 
            style={thumbnailStyles.image}
            resizeMode="cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          {imageLoading && (
            <View style={thumbnailStyles.imageLoadingOverlay}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          )}
          {!imageLoading && !imageError && (
            <>
              <View style={thumbnailStyles.imageOverlay}>
                <MaterialIcon name="search" size={16} color="#FFF" />
              </View>
              <View style={thumbnailStyles.imageIndex}>
                <Text style={thumbnailStyles.imageIndexText}>{index + 1}</Text>
              </View>
            </>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

// Modal image component with error handling
interface ModalImageProps {
  imageUrl: string;
  isDarkMode: boolean;
}

const ModalImage: React.FC<ModalImageProps> = ({ imageUrl, isDarkMode }) => {
  const [modalImageLoading, setModalImageLoading] = useState(true);
  const [modalImageError, setModalImageError] = useState(false);

  const handleModalImageLoad = () => {
    setModalImageLoading(false);
    setModalImageError(false);
  };

  const handleModalImageError = () => {
    setModalImageLoading(false);
    setModalImageError(true);
    console.warn(`Failed to load modal image: ${imageUrl}`);
  };

  const modalStyles = createStyles(isDarkMode);

  return (
    <View style={modalStyles.modalImageContainer}>
      {modalImageError ? (
        <View style={modalStyles.modalErrorContainer}>
          <MaterialIcon name="error" size={64} color="#FF3B30" />
          <Text style={modalStyles.modalErrorText}>Failed to load image</Text>
          <Text style={modalStyles.modalErrorSubtext}>The image could not be displayed</Text>
        </View>
      ) : (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={modalStyles.modalImage}
            resizeMode="contain"
            onLoad={handleModalImageLoad}
            onError={handleModalImageError}
          />
          {modalImageLoading && (
            <View style={modalStyles.modalLoadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={modalStyles.modalLoadingText}>Loading image...</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const BillItemImageGallery: React.FC<BillItemImageGalleryProps> = ({
  billId,
  itemId,
  itemName,
}) => {
  const { isDarkMode } = useThemeContext();
  // Create a unique component ID for debugging
  const componentId = `${billId}-${itemId}-${itemName}`.replace(/[^a-zA-Z0-9]/g, '_');
  
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  console.log(`[${componentId}] BillItemImageGallery component created for ${itemName} (${itemId})`);
  console.log(`[${componentId}] Current state - images: ${images.length}, loading: ${loading}, error: ${error}`);

  // Debug state changes
  React.useEffect(() => {
    console.log(`[${componentId}] State updated - images count: ${images.length}`);
    if (images.length > 0) {
      console.log(`[${componentId}] Current images in state:`, images);
    }
  }, [images]);

  useEffect(() => {
    console.log(`[${componentId}] useEffect triggered - loading images`);
    loadImages();
  }, [billId, itemId]);

  const loadImages = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`[${componentId}] Loading images for bill ${billId}, item ${itemId}, itemName: ${itemName} (forceRefresh: ${forceRefresh})`);
      
      // Clear cache if force refresh is requested
      if (forceRefresh) {
        try {
          const cacheManager = (await import('../services/cacheManager')).default;
          const cacheKey = `bill_item_images_${billId}_${itemId}`;
          await cacheManager.remove(cacheKey);
          console.log(`[${componentId}] Cleared cache: ${cacheKey}`);
        } catch (cacheError) {
          console.warn(`[${componentId}] Failed to clear cache:`, cacheError);
        }
      }
      
      const result = await getBillItemImages(billId, itemId);
      console.log(`[${componentId}] API response:`, result);
      console.log(`[${componentId}] API response images array:`, result.images);
      console.log(`[${componentId}] API response totalImages:`, result.totalImages);
      
      if (result.images) {
        console.log(`[${componentId}] Individual image URLs:`);
        result.images.forEach((url, index) => {
          console.log(`[${componentId}] Image ${index + 1}: ${url}`);
        });
      }
      
      setImages(result.images || []);
      
      if (result.images && result.images.length > 0) {
        console.log(`[${componentId}] Successfully loaded ${result.images.length} images`);
        console.log(`[${componentId}] State will be updated with:`, result.images);
      } else {
        console.log(`[${componentId}] No images found`);
      }
    } catch (error) {
      console.error(`[${componentId}] Error loading images:`, error);
      setError('Failed to load images');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1);
    } else {
      setSelectedImageIndex(selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0);
    }
  };

  // Create PanResponder for swipe gestures
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes and ignore small movements
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
    },
    onPanResponderGrant: () => {
      // Gesture started - clear any previous swipe direction
      setSwipeDirection(null);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Provide visual feedback during swipe
      const { dx } = gestureState;
      if (Math.abs(dx) > 30) {
        const direction = dx > 0 ? 'right' : 'left';
        if (swipeDirection !== direction) {
          setSwipeDirection(direction);
        }
      } else {
        if (swipeDirection !== null) {
          setSwipeDirection(null);
        }
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, vx } = gestureState;
      const swipeThreshold = 50; // Minimum distance for swipe
      const velocityThreshold = 0.3; // Minimum velocity for swipe

      // Clear swipe direction feedback
      setSwipeDirection(null);

      // Check if it's a valid swipe (either distance or velocity based)
      if (Math.abs(dx) > swipeThreshold || Math.abs(vx) > velocityThreshold) {
        if (dx > 0 || vx > 0) {
          // Swipe right - go to previous image
          navigateImage('prev');
        } else {
          // Swipe left - go to next image
          navigateImage('next');
        }
      }
    },
    onPanResponderTerminate: () => {
      // Gesture was terminated - clear feedback
      setSwipeDirection(null);
    },
  });

  const styles = createStyles(isDarkMode);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading images...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcon name="error" size={20} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadImages(true)}
        >
          <MaterialIcon name="refresh" size={16} color="#007AFF" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (images.length === 0) {
    return null; // Don't show anything if no images
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcon name="image" size={16} color="#007AFF" />
        <Text style={styles.title}>Reference Images ({images.length})</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.imagesContainer}
        contentContainerStyle={styles.imagesContent}
      >
        {images.map((imageUrl, index) => (
          <ImageThumbnail
            key={index}
            imageUrl={imageUrl}
            index={index}
            onPress={() => openImageModal(index)}
            isDarkMode={isDarkMode}
          />
        ))}
      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={selectedImageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {itemName} - Image {(selectedImageIndex || 0) + 1} of {images.length}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeImageModal}
            >
              <MaterialIcon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {selectedImageIndex !== null && (
            <View 
              style={styles.swipeableContainer}
              {...panResponder.panHandlers}
            >
              <ModalImage
                imageUrl={images[selectedImageIndex]}
                isDarkMode={isDarkMode}
              />
              
              {/* Swipe Direction Indicators */}
              {swipeDirection && (
                <View style={[
                  styles.swipeIndicator,
                  swipeDirection === 'left' ? styles.swipeIndicatorLeft : styles.swipeIndicatorRight
                ]}>
                  <MaterialIcon 
                    name={swipeDirection === 'left' ? 'chevron-left' : 'chevron-right'} 
                    size={40} 
                    color="#FFF" 
                  />
                </View>
              )}
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.modalNavigation}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateImage('prev')}
              >
                <MaterialIcon name="chevron-left" size={32} color="#FFF" />
              </TouchableOpacity>
              
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {(selectedImageIndex || 0) + 1} / {images.length}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateImage('next')}
              >
                <MaterialIcon name="chevron-right" size={32} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  retryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  imagesContainer: {
    marginTop: 4,
  },
  imagesContent: {
    paddingRight: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndex: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndexText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50, // Account for status bar
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  swipeableContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: screenWidth - 32,
    height: screenHeight - 200,
  },
  modalNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 50, // Account for home indicator
  },
  navButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
  },
  imageCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  imageCounterText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Error handling styles for thumbnails
  errorImageWrapper: {
    opacity: 0.6,
  },
  errorImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderStyle: 'dashed',
  },
  errorImageText: {
    fontSize: 10,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  // Modal error handling styles
  modalErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalErrorText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  modalErrorSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalLoadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  // Swipe indicator styles
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -30 }],
  },
  swipeIndicatorLeft: {
    left: 20,
  },
  swipeIndicatorRight: {
    right: 20,
  },
});

export default BillItemImageGallery;