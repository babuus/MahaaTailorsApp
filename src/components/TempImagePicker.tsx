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

interface TempImagePickerProps {
  images: string[]; // Base64 encoded images
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const TempImagePicker: React.FC<TempImagePickerProps> = ({
  images,
  onImagesChange,
  maxImages = 7,
}) => {
  const { isDarkMode } = useThemeContext();
  const [loading, setLoading] = useState(false);

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

    if (response.errorCode) {
      console.error('Image picker error code:', response.errorCode);
      Alert.alert('Error', 'Failed to access camera or photo library. Please check permissions.');
      return;
    }

    if (response.assets && response.assets.length > 1) {
      // Handle multiple images
      handleMultipleImages(response.assets);
    } else {
      // Handle single image (camera or single selection)
      const asset = response.assets?.[0];
      if (!asset) {
        console.error('No asset in response');
        Alert.alert('Error', 'No image was selected.');
        return;
      }

      console.log('Asset details:', {
        uri: asset.uri,
        type: asset.type,
        hasBase64: !!asset.base64,
        base64Length: asset.base64?.length || 0
      });

      if (!asset.base64) {
        console.error('No base64 data in asset');
        Alert.alert('Error', 'Failed to process the selected image. Please try again.');
        return;
      }

      try {
        // Store base64 image temporarily
        const imageData = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
        const updatedImages = [...images, imageData];
        console.log('Successfully added image, total images:', updatedImages.length);
        onImagesChange(updatedImages);
      } catch (error) {
        console.error('Error processing image:', error);
        Alert.alert('Error', 'Failed to process the selected image. Please try again.');
      }
    }
  };

  const handleMultipleImages = (assets: any[]) => {
    console.log(`Processing ${assets.length} selected images`);
    
    const newBase64Images: string[] = [];
    let processedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      console.log(`Processing asset ${i + 1}:`, asset.fileName || `image_${i + 1}`);
      
      if (asset.base64) {
        const imageData = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
        newBase64Images.push(imageData);
        processedCount++;
        console.log(`Successfully processed image ${i + 1}, size: ${imageData.length}`);
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
  };

  const pickImage = () => {
    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only add up to ${maxImages} images per item.`);
      return;
    }

    Alert.alert(
      'Add Image',
      'Choose your preferred method to add an image',
      [
        {
          text: '📷 Camera',
          onPress: () => openCamera(),
        },
        {
          text: '🖼️ Photo Library',
          onPress: () => openPhotoLibrary(),
        },
        {
          text: '🧪 Test Image',
          onPress: () => addTestImage(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // First check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        console.log('Camera permission already granted:', hasPermission);
        
        if (hasPermission) {
          return true;
        }

        // Request permission
        console.log('Requesting camera permission...');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'MahaaTailors needs camera access to take photos of bill items. This helps you keep visual records of your work.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        );
        
        console.log('Camera permission request result:', granted);
        console.log('Available results:', PermissionsAndroid.RESULTS);
        
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('Permission granted:', isGranted);
        return isGranted;
      } catch (err) {
        console.error('Error requesting camera permission:', err);
        return false;
      }
    }
    // iOS permissions are handled automatically by the image picker
    return true;
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // For Android 13+ (API 33+), use READ_MEDIA_IMAGES
        // For older versions, use READ_EXTERNAL_STORAGE
        const permission = Platform.Version >= 33 
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES 
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        
        console.log('Using permission:', permission, 'for Android API level:', Platform.Version);
        
        // First check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(permission);
        console.log('Storage/Media permission already granted:', hasPermission);
        
        if (hasPermission) {
          return true;
        }

        // Request permission
        console.log('Requesting storage/media permission...');
        const granted = await PermissionsAndroid.request(
          permission,
          {
            title: 'Photos Permission Required',
            message: 'MahaaTailors needs access to your photos to select images for bill items.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        );
        
        console.log('Storage/Media permission request result:', granted);
        console.log('Available results:', PermissionsAndroid.RESULTS);
        
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('Permission granted:', isGranted);
        return isGranted;
      } catch (err) {
        console.error('Error requesting storage/media permission:', err);
        return false;
      }
    }
    // iOS permissions are handled automatically by the image picker
    return true;
  };

  const openAppSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.openSettings();
      } else {
        await Linking.openURL('app-settings:');
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert('Error', 'Could not open settings. Please manually go to Settings > Apps > MahaaTailors > Permissions');
    }
  };

  const openCamera = async () => {
    console.log('Requesting camera permission...');
    const hasPermission = await requestCameraPermission();
    
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission Required',
        'To take photos for bill items, please allow camera access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
          { text: 'Try Again', onPress: () => openCamera() }
        ]
      );
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: true,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
    };

    console.log('Opening camera with permission granted...');
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
      console.log('Camera timeout - resetting loading state');
      setLoading(false);
      Alert.alert('Timeout', 'Camera operation timed out. Please try again.');
    }, 30000);

    try {
      launchCamera(options, (response) => handleImagePickerResponse(response, timeoutId));
    } catch (error) {
      console.error('Error launching camera:', error);
      clearTimeout(timeoutId);
      setLoading(false);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const addTestImage = () => {
    // Add a small test image for development/testing purposes
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageData = `data:image/png;base64,${testImageBase64}`;
    const updatedImages = [...images, imageData];
    console.log('Added test image, total images:', updatedImages.length);
    onImagesChange(updatedImages);
  };

  const showTroubleshootingInfo = () => {
    Alert.alert(
      'Image Picker Troubleshooting',
      'The image picker is not working. Here are the possible solutions:\n\n' +
      '1. REBUILD PROJECT:\n' +
      '   • Run: npx react-native clean\n' +
      '   • Run: npx react-native run-android\n\n' +
      '2. CHECK PERMISSIONS:\n' +
      '   • Camera permission\n' +
      '   • Storage permission\n\n' +
      '3. TRY REAL DEVICE:\n' +
      '   • Simulators have limitations\n\n' +
      '4. USE TEST IMAGE:\n' +
      '   • For now, use "Add Test Image" option',
      [
        { text: 'Add Test Image', onPress: () => addTestImage() },
        { text: 'OK' }
      ]
    );
  };

  const openPhotoLibrary = async () => {
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', `You can only add up to ${maxImages} images per item.`);
      return;
    }

    console.log('Requesting storage permission...');
    const hasPermission = await requestStoragePermission();
    
    if (!hasPermission) {
      Alert.alert(
        'Storage Permission Required',
        'To select photos for bill items, please allow storage access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppSettings },
          { text: 'Try Again', onPress: () => openPhotoLibrary() }
        ]
      );
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: true,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.8,
      selectionLimit: remainingSlots, // Allow multiple selection up to remaining slots
    };

    console.log(`Opening photo library with permission granted... (can select up to ${remainingSlots} images)`);
    console.log('Options:', JSON.stringify(options, null, 2));
    setLoading(true);
    
    // Shorter timeout for testing
    const timeoutId = setTimeout(() => {
      console.log('Photo library timeout - resetting loading state');
      setLoading(false);
      Alert.alert(
        'Image Picker Issue', 
        'The image picker is not responding. This might be due to:\n\n• Missing permissions\n• Simulator limitations\n• Library configuration issues\n\nTry running on a real device or check permissions.',
        [
          { text: 'OK' },
          { 
            text: 'Add Test Image', 
            onPress: () => addTestImage() 
          }
        ]
      );
    }, 10000); // Increased to 10 seconds after permission grant

    try {
      console.log('About to call launchImageLibrary...');
      const result = launchImageLibrary(options, (response) => {
        console.log('CALLBACK TRIGGERED - This should appear if the callback works');
        handleImagePickerResponse(response, timeoutId);
      });
      console.log('launchImageLibrary returned:', result);
    } catch (error) {
      console.error('Error launching photo library:', error);
      clearTimeout(timeoutId);
      setLoading(false);
      Alert.alert('Error', `Failed to open photo library: ${error.message}`);
    }
  };

  const removeImage = (index: number) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedImages = images.filter((_, i) => i !== index);
            onImagesChange(updatedImages);
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
          {loading ? 'Loading...' : 'Add Image'}
        </Text>
      </TouchableOpacity>

      {/* Images Grid */}
      {images.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
        >
          {images.map((imageData, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri: imageData }} style={styles.image} />
              
              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
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
          <Text style={styles.emptyStateText}>No images added</Text>
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
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  addButtonDisabled: {
    borderColor: '#C7C7CC',
    opacity: 0.5,
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
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 6,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndexText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  emptyStateText: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
    marginTop: 8,
  },
});

export default TempImagePicker;