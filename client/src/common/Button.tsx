import { ChevronDownIcon } from './icons';
import React, { ReactNode } from 'react';
import styles from './Button.module.css';
import { Menu, MenuContent, MenuTrigger } from './Menu';

const ICON_SIZE = 18;

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: any;
  variant?: string;
  htmlType?: 'button' | 'submit' | 'reset' | undefined;
  menuItems?: ReactNode[];
}

export type Ref = HTMLButtonElement;

const Button = React.forwardRef<Ref, Props>(
  (
    {
      children,
      icon,
      variant,
      htmlType,
      disabled,
      className,
      menuItems,
      ...rest
    },
    ref,
  ) => {
    const classNames = [styles.btn];

    if (variant === 'primary') {
      classNames.push(styles.primary);
    } else if (variant === 'danger') {
      classNames.push(styles.danger);
    } else if (variant === 'ghost') {
      classNames.push(styles.ghost);
    } else if (variant === 'primary-ghost') {
      classNames.push(styles.primaryGhost);
    }

    if (className) {
      classNames.push(className);
    }

    const leftClassNames = [...classNames];
    const rightClassNames = [...classNames, styles.menuButton];

    if (menuItems) {
      leftClassNames.push(styles.leftWithMenu);
    }

    return (
      <>
        <button
          ref={ref}
          className={leftClassNames.join(' ')}
          type={htmlType || 'button'}
          disabled={disabled}
          {...rest}
        >
          {icon && React.cloneElement(icon, { size: ICON_SIZE }, null)}
          {children && icon && <span style={{ width: 4 }} />}
          {children}
        </button>
        {menuItems && menuItems.length > 0 && (
          <Menu>
            <MenuTrigger
              disabled={disabled}
              className={rightClassNames.join(' ')}
              aria-label="More actions"
            >
              <ChevronDownIcon size={14} style={{ marginTop: 2 }} />
            </MenuTrigger>
            <MenuContent align="end">{menuItems}</MenuContent>
          </Menu>
        )}
      </>
    );
  },
);

export default Button;
