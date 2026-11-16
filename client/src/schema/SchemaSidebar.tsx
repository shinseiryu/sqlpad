import {
  MenuDownIcon as OpenIcon,
  MenuRightIcon as ClosedIcon,
  RefreshIcon,
} from '../common/icons';
import { MenuItem, PositionedMenu } from '../common/Menu';
import React, { ChangeEvent, ReactNode, useState } from 'react';
import { useElementSize } from '../utilities/use-element-size';
import { List, RowComponentProps } from 'react-window';
import Divider from '../common/Divider';
import ErrorBlock from '../common/ErrorBlock';
import IconButton from '../common/IconButton';
import Input from '../common/Input';
import Sidebar from '../common/Sidebar';
import SpinKitCube from '../common/SpinKitCube';
import Text from '../common/Text';
import Tooltip from '../common/Tooltip';
import { loadSchema, toggleSchemaItem } from '../stores/editor-actions';
import {
  ExpandedMap,
  useSchemaState,
  useSessionConnectionId,
  useSessionSchemaExpanded,
} from '../stores/editor-store';
import getSchemaList, { SchemaListItem } from './getSchemaList';
import styles from './SchemaSidebar.module.css';
import searchSchemaInfo from './searchSchemaInfo';

const ICON_SIZE = 22;
const ICON_STYLE = { marginBottom: -6, marginRight: 0, marginLeft: -6 };

function formatIdentifiers(s: string, quoteChars = '') {
  const leftQuote = quoteChars[0] || '';
  const rightQuote = quoteChars[1] || quoteChars[0] || '';

  return s
    .split('.')
    .map((s) => `${leftQuote}${s}${rightQuote}`)
    .join('.');
}

/**
 * Input fields for clipboard copy value sourcing
 * The input must be visible/displayed somewhere, in our case offscreen
 * @param props
 */
function OffScreenInput({ id, value }: { id: string; value: string }) {
  return (
    <input
      id={id}
      type="text"
      readOnly
      style={{ position: 'absolute', left: -9999 }}
      value={value}
    />
  );
}

/**
 * MenuItem to query for related input rendered and select and copy its text
 * @param props
 */
function CopyMenuItem({ id, value }: { id: string; value: string }) {
  return (
    <MenuItem
      onSelect={() => {
        const copyText: HTMLInputElement | null = document.querySelector(id);
        if (copyText) {
          copyText.select();
          document.execCommand('copy');
        }
      }}
    >
      Copy <span className="monospace-font">{value}</span> to clipboard
    </MenuItem>
  );
}

interface SchemaRowProps {
  visibleItems: SchemaListItem[];
  expanded: ExpandedMap;
  connectionId: string;
}

function SchemaRow({
  ariaAttributes,
  index,
  style,
  visibleItems,
  expanded,
  connectionId,
}: RowComponentProps<SchemaRowProps>) {
  const row = visibleItems[index];

  if (!row) {
    return null;
  }

  const classNames = [styles.schemaItem];

  let icon = null;

  const expandable = row.type === 'schema' || row.type === 'table';
  if (expandable) {
    classNames.push(styles.expandable);
    icon =
      expanded[row.id] === true ? (
        <OpenIcon size={ICON_SIZE} style={ICON_STYLE} />
      ) : (
        <ClosedIcon size={ICON_SIZE} style={ICON_STYLE} />
      );
  }

  const indentationPadding = row.level * 20 + (!expandable ? 10 : 0);

  const description = row.description ? (
    <Tooltip
      key="colDesc"
      label={row.description}
      style={{
        maxWidth: '300px',
        whiteSpace: 'normal',
      }}
    >
      <span>{row.description}</span>
    </Tooltip>
  ) : null;

  const dataType = row.dataType ? <span>{row.dataType}</span> : null;

  let secondary = null;
  if (dataType && description) {
    secondary = (
      <Text type="secondary" style={{ paddingLeft: 8 }}>
        {dataType} - {description}
      </Text>
    );
  } else if (dataType) {
    secondary = (
      <Text type="secondary" style={{ paddingLeft: 8 }}>
        {dataType}
      </Text>
    );
  } else if (description) {
    secondary = (
      <Text type="secondary" style={{ paddingLeft: 8 }}>
        {description}
      </Text>
    );
  }

  function handleClick() {
    if (expandable) {
      toggleSchemaItem(connectionId, row);
    }
  }

  // TODO either switch to button or improve aria for clicking on li
  return (
    <li
      {...ariaAttributes}
      id={row.id}
      key={row.id}
      className={classNames.join(' ')}
      style={{ ...style, paddingLeft: indentationPadding }}
      onClick={handleClick}
    >
      {icon}
      {row.name}
      {secondary}
    </li>
  );
}

function SchemaSidebar() {
  const connectionId = useSessionConnectionId();
  const [search, setSearch] = useState('');
  const [measureRef, dimensions] = useElementSize();

  const [contextTop, setContextTop] = useState(0);
  const [contextLeft, setContextLeft] = useState(0);
  const [schemaItemId, setSchemaItemId] = useState('');
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const expanded = useSessionSchemaExpanded(connectionId);
  const { loading, connectionSchema, error } = useSchemaState(connectionId);

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (connectionId) {
      loadSchema(connectionId, true);
    }
  };

  const filteredSchemaInfo = searchSchemaInfo(connectionSchema || {}, search);
  const visibleItems = getSchemaList(filteredSchemaInfo, expanded);

  let content: ReactNode;
  if (error) {
    content = <ErrorBlock>{error}</ErrorBlock>;
  } else if (loading) {
    content = (
      <div className={styles.schemaSpinner}>
        <SpinKitCube />
      </div>
    );
  } else {
    content = (
      <ul style={{ paddingLeft: 0 }}>
        <List
          // position absolute takes list out of flow,
          // preventing some weird measuring behavior in Firefox
          style={{
            position: 'absolute',
            height: Math.max(0, dimensions.height),
            width: Math.max(0, dimensions.width),
          }}
          rowCount={visibleItems.length}
          rowHeight={22}
          rowComponent={SchemaRow}
          rowProps={{ visibleItems, expanded, connectionId }}
          overscanCount={10}
        />
      </ul>
    );
  }

  // On right-click we'd like to show a context menu related to item clicked
  // For now this will be options to copy the full path of the item
  // The menu is anchored at the location clicked
  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();

    // target needs casting as no way of knowing what it is
    const target = event.target as HTMLDivElement;
    const id = target?.id;

    setSchemaItemId(id);
    setContextTop(event.clientY);
    setContextLeft(event.clientX);

    setContextMenuOpen(Boolean(id));
  }

  return (
    <Sidebar>
      <div style={{ display: 'flex' }}>
        <Input
          value={search}
          placeholder="Search schema"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setSearch(event.target.value)
          }
        />
        <IconButton
          tooltip="Refresh schema"
          style={{ marginLeft: 8 }}
          disabled={loading}
          onClick={handleRefreshClick}
        >
          <RefreshIcon />
        </IconButton>
      </div>

      <Divider style={{ margin: '4px 0' }} />

      {/* Input fields for copy-paste value sourcing */}
      <OffScreenInput
        id="schema-copy-value-no-quote"
        value={formatIdentifiers(schemaItemId)}
      />
      <OffScreenInput
        id="schema-copy-value-quote"
        value={formatIdentifiers(schemaItemId, '"')}
      />
      <OffScreenInput
        id="schema-copy-value-bracket"
        value={formatIdentifiers(schemaItemId, '[]')}
      />

      <PositionedMenu
        open={contextMenuOpen}
        onOpenChange={setContextMenuOpen}
        left={contextLeft}
        top={contextTop}
      >
        <CopyMenuItem
          id="#schema-copy-value-no-quote"
          value={formatIdentifiers(schemaItemId)}
        />
        <CopyMenuItem
          id="#schema-copy-value-quote"
          value={formatIdentifiers(schemaItemId, '"')}
        />
        <CopyMenuItem
          id="#schema-copy-value-bracket"
          value={formatIdentifiers(schemaItemId, '[]')}
        />
      </PositionedMenu>

      <div
        style={{
          display: 'flex',
          flexGrow: 1,
        }}
      >
        <div
          ref={measureRef}
          onContextMenu={handleContextMenu}
          style={{
            display: 'flex',
            width: '100%',
          }}
        >
          {content}
        </div>
      </div>
    </Sidebar>
  );
}

export default React.memo(SchemaSidebar);
