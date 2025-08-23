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
} from 'react-native';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { useThemeContext } from '../contexts/ThemeContext';
import MaterialIcon from './MaterialIcon';
import { uploadBillItemImage, deleteBillItemImage } from '../services/api';

interface ImagePickerProps {
  billId: string;
  itemId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  billId,
  itemId,
  images,
  onImagesChange,
  maxImages = 5,
}) => {
  const { isDarkMode } = useThemeContext();
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const pickImage = () => {
    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxImages} images per item.`);
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: true,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      const asset = response.assets?.[0];
      if (!asset || !asset.base64) {
        Alert.alert('Error', 'Failed to process the selected image.');
        return;
      }

      uploadImage(asset.base64, asset.fileName || 'image.jpg', asset.type || 'image/jpeg');
    });
  };

  const uploadImage = async (base64Data: string, fileName: string, contentType: string) => {
    setUploading(true);
    try {
      const result = await uploadBillItemImage(billId, itemId, base64Data, fileName, contentType);
      const updatedImages = [...images, result.imageUrl];
      onImagesChange(updatedImages);
      
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageUrl: string) => {
    // Extract image ID from URL
    const imageId = imageUrl.split('/').pop()?.split('.')[0];
    if (!imageId) {
      Alert.alert('Error', 'Invalid image URL.');
      return;
    }

    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingImageId(imageId);
            try {
              await deleteBillItemImage(billId, itemId, imageId);
              const updatedImages = images.filter(img => img !== imageUrl);
              onImagesChange(updatedImages);
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert('Error', 'Failed to delete image. Please try again.');
            } finally {
              setDeletingImageId(null);
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
        <Text style={styles.title}>Reference Images</Text>
        <Text style={styles.subtitle}>
          Add reference images for this item ({images.length}/{maxImages})
        </Text>
      </View>

      {/* Add Image Button */}
      <TouchableOpacity
        style={[
          styles.addButton,
          images.length >= maxImages && styles.addButtonDisabled
        ]}
        onPress={pickImage}
        disabled={uploading || images.length >= maxImages}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <MaterialIcon name="add" size={24} color="#007AFF" />
        )}
        <Text style={[
          styles.addButtonText,
          images.length >= maxImages && styles.addButtonTextDisabled
        ]}>
          {uploading ? 'Uploading...' : 'Add Image'}
        </Text>
      </TouchableOpacity>

      {/* Images Grid */}
      {images.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
        >
          {images.map((imageUrl, index) => {
            const imageId = imageUrl.split('/').pop()?.split('.')[0];
            const isDeleting = deletingImageId === imageId;
            
            return (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.image} />
                
                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteImage(imageUrl)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <MaterialIcon name="close" size={16} color="#FFF" />
                  )}
                </TouchableOpacity>

                {/* Image Index */}
                <View style={styles.imageIndex}>
                  <Text style={styles.imageIndexText}>{index + 1}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {images.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcon name="image" size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No images added yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add reference images to help with this item
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  addButtonDisabled: {
    borderColor: '#C7C7CC',
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  addButtonTextDisabled: {
    color: '#C7C7CC',
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndexText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#999' : '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: isDarkMode ? '#666' : '#999',
    textAlign: 'center',
  },
});

export default ImagePicker;