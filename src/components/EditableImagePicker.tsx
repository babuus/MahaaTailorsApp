import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { launchImageLibrary, ImagePickerResponse, MediaType, launchCamera } from 'react-native-image-picker';
import { useThemeContext } from '../contexts/ThemeContext';
import MaterialIcon from './MaterialIcon';

interface EditableImagePickerProps {
  images: string[]; // Can be URLs (existing) or base64 data (new)
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  isEditMode?: boolean;
  billId?: string; // Required for deleting server images
  itemId?: string; // Required for deleting server images
}



const EditableImagePicker: React.FC<EditableImagePickerProps> = ({
  images,
  onImagesChange,
  maxImages = 7,
  isEditMode = false,
  billId,
  itemId,
}) => {
  const { isDarkMode } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Debug logging
  console.log('EditableImagePicker props:', { billId, itemId, isEditMode, imagesCount: images.length });

  // Helper function to determine if an image is a URL or base64
  const isImageUrl = (imageData: string): boolean => {
    return imageData.startsWith('http://') || imageData.startsWith('https://');
  };

  // Helper function to get image source for display
  const getImageSource = (imageData: string) => {
    if (isImageUrl(imageData)) {
      return { uri: imageData };
    } else {
      return { uri: imageData }; // base64 data already includes data:image prefix
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleImagePickerResponse = (response: ImagePickerResponse, timeoutId: NodeJS.Timeout) => {
    console.log('Image picker callback triggered');
    console.log('Image picker response:', JSON.stringify(response, null, 2));

    clearTimeout(timeoutId);
    setLoading(false);

    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.errorMessage) {
      console.error('Image picker error:', response.errorMessage);
      Alert.alert('Error', `Failed to select image: ${response.errorMessage}`);
      return;
    }

    if (response.assets && response.assets.length > 0) {
      const asset = response.assets[0];
      console.log('Selected asset:', JSON.stringify(asset, null, 2));

      if (asset.base64) {
        const base64Image = `data:${asset.type};base64,${asset.base64}`;
        console.log('Adding base64 image, length:', base64Image.length);
        const updatedImages = [...images, base64Image];
        onImagesChange(updatedImages);
      } else {
        console.error('No base64 data in selected image');
        Alert.alert('Error', 'Failed to process selected image. Please try again.');
      }
    } else {
      console.error('No assets in image picker response');
      Alert.alert('Error', 'No image was selected. Please try again.');
    }
  };

  const handleMultipleImagePickerResponse = (response: ImagePickerResponse, timeoutId: NodeJS.Timeout) => {
    console.log('Multiple image picker callback triggered');
    console.log('Multiple image picker response:', JSON.stringify(response, null, 2));

    clearTimeout(timeoutId);
    setLoading(false);

    if (response.didCancel) {
      console.log('User cancelled multiple image picker');
      return;
    }

    if (response.errorMessage) {
      console.error('Multiple image picker error:', response.errorMessage);
      Alert.alert('Error', `Failed to select images: ${response.errorMessage}`);
      return;
    }

    if (response.assets && response.assets.length > 0) {
      console.log(`Processing ${response.assets.length} selected images`);

      const newBase64Images: string[] = [];
      let processedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < response.assets.length; i++) {
        const asset = response.assets[i];
        console.log(`Processing asset ${i + 1}:`, asset.fileName || `image_${i + 1}`);

        if (asset.base64) {
          const base64Image = `data:${asset.type};base64,${asset.base64}`;
          newBase64Images.push(base64Image);
          processedCount++;
          console.log(`Successfully processed image ${i + 1}, size: ${base64Image.length}`);
        } else {
          console.error(`No base64 data in image ${i + 1}`);
          errorCount++;
        }
      }

      if (newBase64Images.length > 0) {
        const updatedImages = [...images, ...newBase64Images];

        // Check if we exceed the limit
        if (updatedImages.length > maxImages) {
          const allowedCount = maxImages - images.length;
          const finalImages = [...images, ...newBase64Images.slice(0, allowedCount)];
          onImagesChange(finalImages);

          Alert.alert(
            'Image Limit Reached',
            `Only ${allowedCount} of ${newBase64Images.length} selected images were added due to the ${maxImages} image limit.`
          );
        } else {
          onImagesChange(updatedImages);
        }

        console.log(`Added ${Math.min(newBase64Images.length, maxImages - images.length)} images successfully`);

        if (errorCount > 0) {
          Alert.alert(
            'Partial Success',
            `${processedCount} images added successfully. ${errorCount} images failed to process.`
          );
        }
      } else {
        console.error('No valid images could be processed');
        Alert.alert('Error', 'Failed to process any of the selected images. Please try again.');
      }
    } else {
      console.error('No assets in multiple image picker response');
      Alert.alert('Error', 'No images were selected. Please try again.');
    }
  };

  const pickImageFromLibrary = () => {
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', `You can only add up to ${maxImages} images.`);
      return;
    }

    console.log(`Opening image library... (can select up to ${remainingSlots} images)`);
    setLoading(true);

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: true,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8 as any, // TypeScript issue with PhotoQuality type
      selectionLimit: remainingSlots, // Allow multiple selection up to remaining slots
    };

    // Set a timeout to handle cases where the callback might not be called
    const timeoutId = setTimeout(() => {
      console.log('Image picker timeout - callback not called within 30 seconds');
      setLoading(false);
    }, 30000);

    launchImageLibrary(options, (response) => handleMultipleImagePickerResponse(response, timeoutId));
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only add up to ${maxImages} images.`);
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera permission in settings to take photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    console.log('Opening camera...');
    setLoading(true);

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: true,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8 as any, // TypeScript issue with PhotoQuality type
    };

    // Set a timeout to handle cases where the callback might not be called
    const timeoutId = setTimeout(() => {
      console.log('Camera timeout - callback not called within 30 seconds');
      setLoading(false);
    }, 30000);

    launchCamera(options, (response) => handleImagePickerResponse(response, timeoutId));
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      'Select Image Source',
      'Choose how you want to add an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImageFromLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    const isServerImage = isImageUrl(imageToRemove);

    Alert.alert(
      'Remove Image',
      `Are you sure you want to remove this image?${isServerImage ? ' This will permanently delete it from the server.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingIndex(index);

            try {
              // If it's a server image, delete it from the server first
              if (isServerImage) {
                console.log(`Deleting server image: ${imageToRemove}`);
                console.log(`Using billId: ${billId}, itemId: ${itemId}`);

                // Extract image ID from URL for deletion
                // URL format: https://bucket.s3.region.amazonaws.com/bill-items/billId/itemId/imageId.ext
                const urlParts = imageToRemove.split('/');
                console.log(`URL parts:`, urlParts);
                const fileName = urlParts[urlParts.length - 1]; // e.g., "imageId.jpg"
                const imageId = fileName.split('.')[0]; // Remove extension to get imageId (UUID)

                console.log(`Extracted fileName: ${fileName}, imageId: ${imageId}`);

                if (billId && itemId) {
                  console.log(`Attempting to delete image with billId: ${billId}, itemId: ${itemId}, imageId: ${imageId}`);

                  try {
                    const { deleteBillItemImage } = await import('../services/api');
                    await deleteBillItemImage(billId, itemId, imageId);
                    console.log(`Successfully deleted server image: ${imageId}`);

                    // Clear cache to ensure fresh data on next load
                    try {
                      const { clearCache } = await import('../services/api');
                      await clearCache();
                      console.log('Cache cleared after image deletion');
                    } catch (cacheError) {
                      console.warn('Failed to clear cache after image deletion:', cacheError);
                    }
                  } catch (deleteError) {
                    console.error('Server deletion failed:', deleteError);
                    throw deleteError; // Re-throw to be caught by outer try-catch
                  }
                } else {
                  console.error('Cannot delete server image: billId or itemId not available');
                  console.error('billId:', billId, 'itemId:', itemId);
                  Alert.alert('Error', 'Cannot delete server image: missing bill or item information');
                  setDeletingIndex(null);
                  return;
                }
              }

              // Remove from local state after successful server deletion
              const updatedImages = images.filter((_, i) => i !== index);
              onImagesChange(updatedImages);

              console.log(`Removed image at index ${index}, remaining: ${updatedImages.length}`);

            } catch (error) {
              console.error('Error removing image:', error);
              Alert.alert('Error', 'Failed to remove image from server. Please try again.');
            } finally {
              setDeletingIndex(null);
            }
          }
        }
      ]
    );
  };

  const styles = createStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcon name="image" size={16} color="#007AFF" />
        <Text style={styles.title}>Reference Images</Text>
        <Text style={styles.subtitle}>({images.length}/{maxImages})</Text>
      </View>

      {/* Add Image Button */}
      <TouchableOpacity
        style={[
          styles.addButton,
          images.length >= maxImages && styles.addButtonDisabled
        ]}
        onPress={showImageSourceOptions}
        disabled={loading || images.length >= maxImages}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <MaterialIcon name="add" size={20} color="#007AFF" />
        )}
        <Text style={[
          styles.addButtonText,
          images.length >= maxImages && styles.addButtonTextDisabled
        ]}>
          {loading ? 'Processing...' : images.length === 0 ? 'Add Images' : `Add More (${maxImages - images.length} left)`}
        </Text>
      </TouchableOpacity>

      {/* Images Grid */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
          contentContainerStyle={styles.imagesContent}
        >
          {images.map((imageData, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image
                source={getImageSource(imageData)}
                style={[
                  styles.image,
                  deletingIndex === index && styles.imageDeleting
                ]}
                resizeMode="cover"
              />

              {/* Deleting Overlay */}
              {deletingIndex === index && (
                <View style={styles.deletingOverlay}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.deletingText}>Deleting...</Text>
                </View>
              )}

              {/* Image Type Indicator */}
              <View style={styles.imageTypeIndicator}>
                <MaterialIcon
                  name={isImageUrl(imageData) ? "cloud" : "add"}
                  size={10}
                  color="#FFF"
                />
              </View>

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
                disabled={deletingIndex === index}
              >
                <MaterialIcon name="close" size={14} color="#FFF" />
              </TouchableOpacity>

              {/* Image Index */}
              <View style={styles.imageIndex}>
                <Text style={styles.imageIndexText}>{index + 1}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {images.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcon name="image" size={32} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No images added yet</Text>
          <Text style={styles.emptyStateSubtext}>
            {isEditMode ? 'Add new images or keep existing ones' : 'Add reference images for this item'}
          </Text>
        </View>
      )}
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
    marginBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
  },
  subtitle: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  addButtonDisabled: {
    borderColor: '#C7C7CC',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  addButtonTextDisabled: {
    color: '#C7C7CC',
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
  imageDeleting: {
    opacity: 0.5,
  },
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deletingText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  imageTypeIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndex: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndexText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: isDarkMode ? '#1C1C1E' : '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#999' : '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: isDarkMode ? '#666' : '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default EditableImagePicker;