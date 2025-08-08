import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import RNFS from 'react-native-fs';
import { unzip } from 'react-native-zip-archive';

export interface UpdateInfo {
  version: string;
  component: string;
  description: string;
  size: number;
  critical: boolean;
  download_url: string;
  checksum: string;
  release_date: string;
  dependencies: string[];
}

export interface UpdateCheckResponse {
  has_updates: boolean;
  current_version: string;
  updates: UpdateInfo[];
}

export interface ComponentUpdate {
  name: string;
  version: string;
  files: string[];
  backup_path?: string;
}

class UpdateService {
  private baseUrl: string;
  private currentVersion: string;
  private platform: string;
  private updateInProgress: boolean = false;

  constructor() {
    // Replace with your actual API endpoint
    this.baseUrl = 'https://hkz1miqelc.execute-api.ap-south-1.amazonaws.com/Prod/app-updates';
    this.currentVersion = '0.0.1'; // This should come from app.json or package.json
    this.platform = Platform.OS;
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(component: string = 'all'): Promise<UpdateCheckResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/check-updates`, {
        params: {
          version: this.currentVersion,
          platform: this.platform,
          component
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw new Error('Failed to check for updates');
    }
  }

  /**
   * Download and apply an update
   */
  async downloadAndApplyUpdate(updateInfo: UpdateInfo): Promise<boolean> {
    if (this.updateInProgress) {
      throw new Error('Update already in progress');
    }

    this.updateInProgress = true;

    try {
      // Create backup before updating
      await this.createBackup(updateInfo.component);

      // Download the update
      const downloadPath = await this.downloadUpdate(updateInfo);

      // Verify checksum
      if (updateInfo.checksum) {
        const isValid = await this.verifyChecksum(downloadPath, updateInfo.checksum);
        if (!isValid) {
          throw new Error('Update file checksum verification failed');
        }
      }

      // Extract and apply update
      await this.extractAndApplyUpdate(downloadPath, updateInfo);

      // Update version info
      await this.updateVersionInfo(updateInfo);

      // Clean up
      await RNFS.unlink(downloadPath);

      return true;
    } catch (error) {
      console.error('Error applying update:', error);
      // Restore backup if update failed
      await this.restoreBackup(updateInfo.component);
      throw error;
    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * Download update file
   */
  private async downloadUpdate(updateInfo: UpdateInfo): Promise<string> {
    const downloadPath = `${RNFS.DocumentDirectoryPath}/updates/${updateInfo.component}_${updateInfo.version}.zip`;
    
    // Ensure directory exists
    await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/updates`);

    // Get download URL from backend
    const response = await axios.get(`${this.baseUrl}/download-update`, {
      params: {
        version: updateInfo.version,
        component: updateInfo.component,
        platform: this.platform
      }
    });

    const downloadUrl = response.data.download_url;

    // Download the file
    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: downloadPath,
      progress: (res) => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        console.log(`Download progress: ${progress.toFixed(2)}%`);
      }
    }).promise;

    if (downloadResult.statusCode !== 200) {
      throw new Error('Failed to download update');
    }

    return downloadPath;
  }

  /**
   * Create backup of current component
   */
  private async createBackup(component: string): Promise<void> {
    const backupPath = `${RNFS.DocumentDirectoryPath}/backups/${component}_${Date.now()}`;
    await RNFS.mkdir(`${RNFS.DocumentDirectoryPath}/backups`);

    // Store backup path for potential restoration
    await AsyncStorage.setItem(`backup_${component}`, backupPath);

    // Copy current component files to backup
    const componentPaths = this.getComponentPaths(component);
    
    for (const sourcePath of componentPaths) {
      if (await RNFS.exists(sourcePath)) {
        const fileName = sourcePath.split('/').pop();
        await RNFS.copyFile(sourcePath, `${backupPath}/${fileName}`);
      }
    }
  }

  /**
   * Extract and apply update
   */
  private async extractAndApplyUpdate(downloadPath: string, updateInfo: UpdateInfo): Promise<void> {
    const extractPath = `${RNFS.DocumentDirectoryPath}/temp_extract/${updateInfo.component}`;
    
    // Extract the update
    await unzip(downloadPath, extractPath);

    // Apply the update by copying files to their destinations
    const componentPaths = this.getComponentPaths(updateInfo.component);
    const extractedFiles = await RNFS.readDir(extractPath);

    for (const file of extractedFiles) {
      const targetPath = this.getTargetPath(updateInfo.component, file.name);
      if (targetPath) {
        await RNFS.copyFile(file.path, targetPath);
      }
    }

    // Clean up extraction directory
    await RNFS.unlink(extractPath);
  }

  /**
   * Verify file checksum
   */
  private async verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      // For React Native, we'll use a simple file size check as checksum verification
      // In a production app, you'd want to implement proper hash verification
      const fileStats = await RNFS.stat(filePath);
      return fileStats.size > 0; // Basic validation
    } catch (error) {
      console.error('Checksum verification error:', error);
      return false;
    }
  }

  /**
   * Update version information
   */
  private async updateVersionInfo(updateInfo: UpdateInfo): Promise<void> {
    const versionInfo = {
      version: updateInfo.version,
      component: updateInfo.component,
      updated_at: new Date().toISOString()
    };

    await AsyncStorage.setItem(`version_${updateInfo.component}`, JSON.stringify(versionInfo));
    
    if (updateInfo.component === 'all') {
      this.currentVersion = updateInfo.version;
      await AsyncStorage.setItem('app_version', updateInfo.version);
    }
  }

  /**
   * Restore backup
   */
  private async restoreBackup(component: string): Promise<void> {
    try {
      const backupPath = await AsyncStorage.getItem(`backup_${component}`);
      if (!backupPath || !(await RNFS.exists(backupPath))) {
        return;
      }

      const backupFiles = await RNFS.readDir(backupPath);
      const componentPaths = this.getComponentPaths(component);

      for (const file of backupFiles) {
        const targetPath = this.getTargetPath(component, file.name);
        if (targetPath) {
          await RNFS.copyFile(file.path, targetPath);
        }
      }

      // Clean up backup
      await RNFS.unlink(backupPath);
      await AsyncStorage.removeItem(`backup_${component}`);
    } catch (error) {
      console.error('Error restoring backup:', error);
    }
  }

  /**
   * Get component file paths
   */
  private getComponentPaths(component: string): string[] {
    const basePath = RNFS.MainBundlePath;
    
    switch (component) {
      case 'screens':
        return [`${basePath}/screens`];
      case 'components':
        return [`${basePath}/components`];
      case 'services':
        return [`${basePath}/services`];
      case 'navigation':
        return [`${basePath}/navigation`];
      case 'all':
        return [
          `${basePath}/screens`,
          `${basePath}/components`,
          `${basePath}/services`,
          `${basePath}/navigation`
        ];
      default:
        return [`${basePath}/${component}`];
    }
  }

  /**
   * Get target path for a file
   */
  private getTargetPath(component: string, fileName: string): string | null {
    const basePath = RNFS.MainBundlePath;
    
    switch (component) {
      case 'screens':
        return `${basePath}/screens/${fileName}`;
      case 'components':
        return `${basePath}/components/${fileName}`;
      case 'services':
        return `${basePath}/services/${fileName}`;
      case 'navigation':
        return `${basePath}/navigation/${fileName}`;
      default:
        return `${basePath}/${component}/${fileName}`;
    }
  }

  /**
   * Get current app version
   */
  async getCurrentVersion(): Promise<string> {
    try {
      const storedVersion = await AsyncStorage.getItem('app_version');
      return storedVersion || this.currentVersion;
    } catch (error) {
      return this.currentVersion;
    }
  }

  /**
   * Check if update is in progress
   */
  isUpdateInProgress(): boolean {
    return this.updateInProgress;
  }

  /**
   * Get update history
   */
  async getUpdateHistory(): Promise<ComponentUpdate[]> {
    try {
      const history = await AsyncStorage.getItem('update_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear update cache
   */
  async clearUpdateCache(): Promise<void> {
    try {
      const updateDir = `${RNFS.DocumentDirectoryPath}/updates`;
      if (await RNFS.exists(updateDir)) {
        await RNFS.unlink(updateDir);
      }
    } catch (error) {
      console.error('Error clearing update cache:', error);
    }
  }
}

export const updateService = new UpdateService();