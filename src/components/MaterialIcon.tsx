import React from 'react';
import { TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import SimpleIcon, { SimpleIconName } from './SimpleIcon';
import { getIconSize, IconSize } from '../utils/materialIconsConfig';

interface MaterialIconProps {
  name: SimpleIconName | string;
  size?: IconSize | number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
}

const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  size = 'md',
  color = '#000000',
  style,
  testID,
  accessibilityLabel,
  onPress,
}) => {
  // Get the size value
  const iconSize = typeof size === 'string' ? getIconSize(size) : size;

  const iconComponent = (
    <SimpleIcon
      name={name as SimpleIconName}
      size={iconSize}
      color={color}
      style={style}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    />
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={{ alignSelf: 'flex-start' }}>
        {iconComponent}
      </TouchableOpacity>
    );
  }

  return iconComponent;
};

export default MaterialIcon;