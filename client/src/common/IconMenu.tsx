import React from 'react';
import { Menu, MenuContent, MenuTrigger } from './Menu';
import Tooltip from './Tooltip';
import iconButtonStyles from './IconButton.module.css';

const ICON_SIZE = 18;

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: any;
  variant?: string;
  tooltip?: string;
}

const IconMenu = ({ children, icon, tooltip, variant, ...rest }: Props) => {
  const className =
    variant === 'ghost'
      ? `${iconButtonStyles.btn} ${iconButtonStyles.ghost}`
      : iconButtonStyles.btn;

  const trigger = (
    <MenuTrigger className={className} {...rest}>
      {icon &&
        React.cloneElement(
          icon,
          {
            size: ICON_SIZE,
          },
          null,
        )}
    </MenuTrigger>
  );

  return (
    <Menu>
      {tooltip ? <Tooltip label={tooltip}>{trigger}</Tooltip> : trigger}
      <MenuContent align="end" className="slide-down">
        {children}
      </MenuContent>
    </Menu>
  );
};

export default IconMenu;
