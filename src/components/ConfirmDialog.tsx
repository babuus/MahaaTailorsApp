import React from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonColor?: string;
  destructive?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmButtonColor,
  destructive = false,
}) => {
  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={onCancel}
      >
        <Dialog.Title accessibilityRole="header">
          {title}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button 
            onPress={onCancel}
            accessibilityLabel={`${cancelText} button`}
            accessibilityHint="Cancels the action"
          >
            {cancelText}
          </Button>
          <Button 
            onPress={onConfirm}
            buttonColor={destructive ? '#d32f2f' : confirmButtonColor}
            textColor={destructive ? '#fff' : undefined}
            accessibilityLabel={`${confirmText} button`}
            accessibilityHint={destructive ? 'Confirms the destructive action' : 'Confirms the action'}
          >
            {confirmText}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default ConfirmDialog;