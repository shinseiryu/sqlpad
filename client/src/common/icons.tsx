import { Icon as MdiIcon } from '@mdi/react';
import {
  mdiAccountMultiple,
  mdiAlert,
  mdiAlertCircleOutline,
  mdiChartBar,
  mdiCheckboxMarkedCircleOutline,
  mdiChevronDown,
  mdiClipboard,
  mdiClose,
  mdiCloseCircleOutline,
  mdiContentCopy,
  mdiContentSave,
  mdiContentSaveEdit,
  mdiDatabase,
  mdiDelete,
  mdiDotsVertical,
  mdiDownload,
  mdiFormatAlignLeft,
  mdiGoogle,
  mdiHistory,
  mdiLandRowsHorizontal,
  mdiMenuDown,
  mdiMenuLeft,
  mdiMenuRight,
  mdiOpenInNew,
  mdiRefresh,
  mdiServerNetwork,
  mdiServerNetworkOff,
  mdiTable,
} from '@mdi/js';
import React from 'react';

export interface IconProps extends React.AriaAttributes {
  /** Pixel size (number) or any CSS length. Defaults to 24 */
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Material Design Icons (@mdi/js paths rendered by @mdi/react), with the
 * same props mdi-react had: numeric size is pixels, and aria-label names the
 * icon (@mdi/react otherwise renders it as role=presentation).
 * `@mdi/react` is CommonJS; import it by name, since under Vite 8 a default
 * import yields the whole module object.
 */
function createIcon(path: string, displayName: string) {
  function Icon({
    size = 24,
    color = 'currentColor',
    'aria-label': ariaLabel,
    style,
    ...rest
  }: IconProps) {
    return (
      <MdiIcon
        path={path}
        size={typeof size === 'number' ? `${size}px` : size}
        color={color}
        title={ariaLabel}
        // @mdi/react writes width/height into the style object it is given
        style={{ ...style }}
        {...rest}
      />
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

export type IconComponent = ReturnType<typeof createIcon>;

export const AccountMultipleIcon = createIcon(
  mdiAccountMultiple,
  'AccountMultipleIcon',
);
export const AlertIcon = createIcon(mdiAlert, 'AlertIcon');
export const AlertCircleOutlineIcon = createIcon(
  mdiAlertCircleOutline,
  'AlertCircleOutlineIcon',
);
export const ChartBarIcon = createIcon(mdiChartBar, 'ChartBarIcon');
export const CheckboxMarkedCircleOutlineIcon = createIcon(
  mdiCheckboxMarkedCircleOutline,
  'CheckboxMarkedCircleOutlineIcon',
);
export const ChevronDownIcon = createIcon(mdiChevronDown, 'ChevronDownIcon');
export const ClipboardIcon = createIcon(mdiClipboard, 'ClipboardIcon');
export const CloseIcon = createIcon(mdiClose, 'CloseIcon');
export const CloseCircleOutlineIcon = createIcon(
  mdiCloseCircleOutline,
  'CloseCircleOutlineIcon',
);
export const ContentCopyIcon = createIcon(mdiContentCopy, 'ContentCopyIcon');
export const ContentSaveIcon = createIcon(mdiContentSave, 'ContentSaveIcon');
export const ContentSaveEditIcon = createIcon(
  mdiContentSaveEdit,
  'ContentSaveEditIcon',
);
export const DatabaseIcon = createIcon(mdiDatabase, 'DatabaseIcon');
export const DeleteIcon = createIcon(mdiDelete, 'DeleteIcon');
export const DotsVerticalIcon = createIcon(mdiDotsVertical, 'DotsVerticalIcon');
export const DownloadIcon = createIcon(mdiDownload, 'DownloadIcon');
export const FormatAlignLeftIcon = createIcon(
  mdiFormatAlignLeft,
  'FormatAlignLeftIcon',
);
export const GoogleIcon = createIcon(mdiGoogle, 'GoogleIcon');
export const HistoryIcon = createIcon(mdiHistory, 'HistoryIcon');
export const LandRowsHorizontalIcon = createIcon(
  mdiLandRowsHorizontal,
  'LandRowsHorizontalIcon',
);
export const MenuDownIcon = createIcon(mdiMenuDown, 'MenuDownIcon');
export const MenuLeftIcon = createIcon(mdiMenuLeft, 'MenuLeftIcon');
export const MenuRightIcon = createIcon(mdiMenuRight, 'MenuRightIcon');
export const OpenInNewIcon = createIcon(mdiOpenInNew, 'OpenInNewIcon');
export const RefreshIcon = createIcon(mdiRefresh, 'RefreshIcon');
export const ServerNetworkIcon = createIcon(
  mdiServerNetwork,
  'ServerNetworkIcon',
);
export const ServerNetworkOffIcon = createIcon(
  mdiServerNetworkOff,
  'ServerNetworkOffIcon',
);
export const TableIcon = createIcon(mdiTable, 'TableIcon');
