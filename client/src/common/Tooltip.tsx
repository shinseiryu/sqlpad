import * as RadixTooltip from '@radix-ui/react-tooltip';
import React from 'react';

export interface Props {
  label: string;
  style?: React.CSSProperties;
  /** Single child element; it must accept a ref and DOM event props */
  children: React.ReactElement;
}

export default function Tooltip({ label, style, children }: Props) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className="tooltip-content"
            side="bottom"
            sideOffset={6}
            collisionPadding={8}
            style={style}
          >
            {label}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
