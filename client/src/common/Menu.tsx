import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React from 'react';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

/**
 * Menu popover rendered in a portal. Styled globally via `.menu-content` in index.css
 */
export const MenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenu.DropdownMenuContentProps
>(({ className, children, ...rest }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      align="start"
      sideOffset={4}
      className={className ? `menu-content ${className}` : 'menu-content'}
      {...rest}
    >
      {children}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
));

export const MenuItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenu.DropdownMenuItemProps
>(({ className, ...rest }, ref) => (
  <DropdownMenu.Item
    ref={ref}
    className={className ? `menu-item ${className}` : 'menu-item'}
    {...rest}
  />
));

export interface PositionedMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  left: number;
  top: number;
  children: React.ReactNode;
}

/**
 * Menu opened programmatically at a viewport position, used for context menus.
 * Non-modal so a right-click elsewhere reaches the underlying content
 * and can reposition the menu.
 */
export function PositionedMenu({
  open,
  onOpenChange,
  left,
  top,
  children,
}: PositionedMenuProps) {
  return (
    <Menu open={open} onOpenChange={onOpenChange} modal={false}>
      <MenuTrigger asChild>
        <span
          aria-hidden
          style={{ position: 'fixed', left, top, width: 0, height: 0 }}
        />
      </MenuTrigger>
      <MenuContent sideOffset={0}>{children}</MenuContent>
    </Menu>
  );
}
