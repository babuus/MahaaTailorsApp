import React from 'react';
import { View } from 'react-native';
import UpdateManager from './UpdateManager';
import UpdateNotification from './UpdateNotification';
import { useUpdateContext } from '../contexts/UpdateContext';

export const UpdateIntegration: React.FC = () => {
  const {
    showUpdateManager,
    showUpdateNotification,
    currentNotification,
    setShowUpdateManager,
    dismissNotification,
    downloadUpdate,
  } = useUpdateContext();

  return (
    <View>
      {/* Update Manager Modal */}
      <UpdateManager
        visible={showUpdateManager}
        onDismiss={() => setShowUpdateManager(false)}
        autoCheck={false}
      />

      {/* Update Notification */}
      <UpdateNotification
        update={currentNotification}
        visible={showUpdateNotification}
        onUpdate={downloadUpdate}
        onDismiss={dismissNotification}
        onViewDetails={() => {
          dismissNotification();
          setShowUpdateManager(true);
        }}
      />
    </View>
  );
};

export default UpdateIntegration;