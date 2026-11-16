import React from 'react';
import { Group, Panel, PanelProps, Separator } from 'react-resizable-panels';

interface SplitGroupProps {
  /** "horizontal" lays panes side by side, "vertical" stacks them */
  orientation: 'horizontal' | 'vertical';
  /** Called while panes are being resized */
  onResize?: () => void;
  children: React.ReactNode;
}

/**
 * Resizable group of panes filling its positioned parent.
 * Panes go in <SplitPane>, separated by <SplitSeparator>.
 */
export function SplitGroup({
  orientation,
  onResize,
  children,
}: SplitGroupProps) {
  return (
    <div className="split-group-container">
      <Group orientation={orientation} onLayoutChange={onResize}>
        {children}
      </Group>
    </div>
  );
}

/**
 * Pane content is positioned relative to the pane, so children using
 * `position: absolute` with full width/height fill it.
 * Numeric sizes are pixels; use strings like "60%" for percentages.
 */
export function SplitPane({ children, ...rest }: PanelProps) {
  return (
    <Panel className="split-pane" {...rest}>
      {children}
    </Panel>
  );
}

export function SplitSeparator() {
  return <Separator className="split-separator" />;
}
