import React from 'react';
import MaterialIcon from './MaterialIcon';
import { MaterialIconName } from '../utils/materialIconsConfig';

interface IconProps {
  name: MaterialIconName | string;
  size?: number;
  color?: string;
  style?: any;
}

const IconComponent: React.FC<IconProps> = ({
  name,
  size = 20,
  color = '#000',
  style,
}) => {
  return (
    <MaterialIcon 
      name={name} 
      size={size} 
      color={color} 
      style={style}
    />
  );
};

export default IconComponent;