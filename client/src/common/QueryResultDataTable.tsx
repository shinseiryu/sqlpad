import React from 'react';
import { CellComponentProps, Grid, GridImperativeAPI } from 'react-window';
import Draggable from 'react-draggable';
import { ElementSize, Measure } from '../utilities/use-element-size';
import { QueryResultFormat, StatementColumn, StatementResults } from '../types';
import styles from './QueryResultDataTable.module.css';
import Modal from './Modal';
import { MenuItem, PositionedMenu } from './Menu';

// https://davidwalsh.name/detect-scrollbar-width
const scrollbarWidth = () => {
  const scrollDiv = document.createElement('div');
  scrollDiv.setAttribute(
    'style',
    'width: 100px; height: 100px; overflow: scroll; position:absolute; top:-9999px;',
  );
  document.body.appendChild(scrollDiv);
  const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  document.body.removeChild(scrollDiv);
  return scrollbarWidth;
};

/**
 * Drag handle for resizing a column.
 * nodeRef keeps react-draggable from calling findDOMNode, which React 19 removed.
 */
function ColumnResizeHandle({ onDrag }: { onDrag: (deltaX: number) => void }) {
  const nodeRef = React.useRef<HTMLSpanElement>(null);
  return (
    <Draggable
      axis="x"
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      defaultClassName="DragHandle"
      defaultClassNameDragging="DragHandleActive"
      onDrag={(event, { deltaX }) => onDrag(deltaX)}
      position={{ x: 0, y: 0 }}
    >
      <span ref={nodeRef} className="DragHandleIcon">
        ⋮
      </span>
    </Draggable>
  );
}

const renderValue = (input: any, column: StatementColumn) => {
  if (input === null || input === undefined) {
    return <em>null</em>;
  } else if (input === true || input === false) {
    return input.toString();
  } else if (column.datatype === 'datetime') {
    // Remove the letters from ISO string and present as is
    return input.replace('T', ' ').replace('Z', '');
  } else if (column.datatype === 'date') {
    // Formats ISO string to YYYY-MM-DD
    return input.substring(0, 10);
  } else if (typeof input === 'object') {
    return JSON.stringify(input, null, 2);
  } else if (typeof input === 'string' && input.match('^https?://')) {
    return (
      <a target="_blank" rel="noopener noreferrer" href={input}>
        {input}
      </a>
    );
  } else {
    // Format Markdown hyperlinks
    if (typeof input === 'string') {
      const mdMatch = input.match('^\\[(.*)\\]\\((https?://.*)\\)$');
      if (mdMatch) {
        return (
          <a target="_blank" rel="noopener noreferrer" href={mdMatch[2]}>
            {mdMatch[1]}
          </a>
        );
      }
    }
    return input;
  }
};

/**
 * Input fields for clipboard copy value sourcing
 * The input must be visible/displayed somewhere, in our case offscreen
 * @param props
 */
function OffScreenInput({ id, value }: { id: string; value: string }) {
  return (
    <textarea
      id={id}
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
  let displayValue = value;
  if (value.length > 30) {
    displayValue = value.substring(0, 30).trim() + '…';
  }

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
      Copy <span className="monospace-font">{displayValue}</span> to clipboard
    </MenuItem>
  );
}

// Hide the overflow so the scroll bar never shows in the header grid
const headerStyle: React.CSSProperties = {
  overflowX: 'hidden',
  overflowY: 'hidden',
};

const bodyStyle: React.CSSProperties = {
  overflow: 'scroll',
};

const headerCellStyle: React.CSSProperties = {
  lineHeight: '22px',
  backgroundColor: '#f4f4f4',
  justifyContent: 'space-between',
  borderBottom: '1px solid #CCC',
  display: 'flex',
  fontWeight: 'bold',
  padding: 4,
};

const cellStyle: React.CSSProperties = {
  lineHeight: '22px',
  padding: 4,
  borderBottom: '1px solid #CCC',
  display: 'relative',
  overflowX: 'hidden',
  overflowY: 'hidden',
  color: 'rgba(0, 0, 0, 0.65)',
  fontFamily:
    "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace",
};

interface QueryResultDataTableProps {
  columns: StatementColumn[];
  rows?: StatementResults;
  queryResultFormat: QueryResultFormat;
}

interface QueryResultDataTableState {
  cellModalVisible: boolean;
  contextMenuOpen: boolean;
  contextTop: number;
  contextLeft: number;
  cellColumnName: string;
  cellCopyValue: string;
  dimensions: {
    width: number;
    height: number;
  };
  columnWidths: {
    [key: string]: number;
  };
  scrollbarWidth: number;
}

/**
 * Data passed to every grid cell and to the size functions.
 * The grid re-renders cells and re-measures columns when any of these change.
 */
interface GridData {
  columns: StatementColumn[];
  rows?: StatementResults;
  columnWidths: { [key: string]: number };
  width: number;
  scrollbarWidth: number;
  onResizeColumn: (dataKey: string, deltaX: number) => void;
}

class QueryResultDataTable extends React.PureComponent<
  QueryResultDataTableProps,
  QueryResultDataTableState
> {
  state: QueryResultDataTableState = {
    cellModalVisible: false,
    contextMenuOpen: false,
    contextTop: 0,
    contextLeft: 0,
    cellColumnName: '',
    cellCopyValue: '',
    dimensions: {
      width: -1,
      height: -1,
    },
    columnWidths: {},
    scrollbarWidth: 0,
  };

  componentDidMount = () => {
    this.setState({ scrollbarWidth: scrollbarWidth() });
  };

  componentDidUpdate = (prevProps: QueryResultDataTableProps) => {
    const { columns } = this.props;
    // Copy so the grid sees a new object and re-measures columns
    const columnWidths = { ...this.state.columnWidths };

    const { width } = this.state.dimensions;

    let newInitialColumn = false;

    if (columns) {
      columns.forEach((column) => {
        const { name, maxLineLength } = column;
        if (!columnWidths[name]) {
          newInitialColumn = true;

          // If this is the only column, give it the entire width minus 40px
          // The 40px accounts for scrollbar + spare column
          // Also serves as a visual reminder/remains visually consistent with other tables that have empty spare column
          if (columns.length === 1) {
            const almostAll = Math.floor(width) - 40;
            columnWidths[name] = almostAll;
            return;
          }

          // This length is number of characters in longest line of data for this column
          let numChars = maxLineLength || 8;
          const CHAR_PIXEL_WIDTH = 8;

          if (name.length > numChars) {
            numChars = name.length;
          }
          let columnWidthGuess = numChars * CHAR_PIXEL_WIDTH;

          // Column width estimates are capped to range between 100 and 350
          // No reason other than these seem like good limits
          if (columnWidthGuess < 100) {
            columnWidthGuess = 100;
          } else if (columnWidthGuess > 350) {
            columnWidthGuess = 350;
          }

          columnWidths[name] = columnWidthGuess;
        }
      });
    }

    if (newInitialColumn) {
      this.setState({ columnWidths });
    }
  };

  // NOTE
  // An empty dummy column is added to the grid for visual purposes
  // If dataKey was found this is a real column of data from the query result
  // If not, it's the dummy column at the end, and it should fill the rest of the grid width
  static getColumnWidth = (
    index: number,
    { columns, columnWidths, scrollbarWidth, width }: GridData,
  ) => {
    const column = columns[index];

    if (column) {
      return columnWidths[column.name] || 0;
    }

    const totalWidthFilled = columns
      .map((col) => columnWidths[col.name])
      .reduce((prev: number, curr: number) => prev + curr, 0);

    if (isNaN(totalWidthFilled)) {
      return 0;
    }

    const fakeColumnWidth = width - totalWidthFilled - scrollbarWidth;
    return fakeColumnWidth < 10 ? 10 : fakeColumnWidth;
  };

  headerGrid = React.createRef<GridImperativeAPI>();

  resizeColumn = (dataKey: string, deltaX: number) => {
    this.setState((prevState) => {
      const prevWidths = prevState.columnWidths;
      const newWidth = prevWidths[dataKey] + deltaX;
      return {
        columnWidths: {
          ...prevWidths,
          [dataKey]: newWidth > 100 ? newWidth : 100,
        },
      };
    });
  };

  static HeaderCell = ({
    ariaAttributes,
    columnIndex,
    style,
    columns,
    onResizeColumn,
  }: CellComponentProps<GridData>) => {
    const column = columns[columnIndex];

    // If dataKey is present this is an actual header to render
    if (column) {
      return (
        <div {...ariaAttributes} style={{ ...style, ...headerCellStyle }}>
          <div>{column.name}</div>
          <ColumnResizeHandle
            onDrag={(deltaX) => onResizeColumn(column.name, deltaX)}
          />
        </div>
      );
    }

    // If this is a dummy header cell render an empty header cell
    return <div {...ariaAttributes} style={{ ...style, ...headerCellStyle }} />;
  };

  static Cell = ({
    ariaAttributes,
    columnIndex,
    rowIndex,
    style,
    columns,
    rows,
  }: CellComponentProps<GridData>) => {
    const column = columns[columnIndex];
    const finalStyle = Object.assign({}, style, cellStyle);

    let scrollboxClass = styles.scrollboxOdd;
    let faderClass = styles.faderOdd;
    if (rowIndex % 2 === 0) {
      finalStyle.backgroundColor = '#fafafa';
      scrollboxClass = styles.scrollboxEven;
      faderClass = styles.faderEven;
    }

    // If dataKey is present this is a real data cell to render
    // SEE COMMENTS IN QueryResultDataTable.module.css FOR ISSUES IN SHADOW IMPLEMENTATION
    if (column) {
      const value = rows?.[rowIndex]?.[columnIndex];
      return (
        <pre
          {...ariaAttributes}
          data-is-cell="true"
          data-column-name={column.name}
          className={scrollboxClass}
          style={finalStyle}
        >
          {renderValue(value, column)}
          <div className={faderClass}></div>
        </pre>
      );
    }

    // If no dataKey this is a dummy cell.
    // It should render nothing, but match the row's style
    return (
      <div {...ariaAttributes} style={finalStyle}>
        <div className="truncate" />
      </div>
    );
  };

  static getRowHeight = (index: number, { rows }: GridData) => {
    if (rows) {
      let lines = 1;
      const row = rows[index] || [];
      row.forEach((value) => {
        if (value === null || value === undefined) {
          return;
        }
        const stringValue =
          typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        const valueLines = stringValue.split('\n').length;
        if (valueLines > lines) {
          lines = valueLines;
        }
      });
      // Line height is 22px, 8 is 4px padding top and bottom
      return lines * 22 + 8;
    }

    return 30;
  };

  // When a scroll occurs in the body grid,
  // synchronize the scroll position of the header grid
  handleGridScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const header = this.headerGrid.current?.element;
    if (header) {
      header.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  handleContainerResize = (dimensions: ElementSize) => {
    this.setState({ dimensions });
  };

  handleContextMenu = (event: React.MouseEvent) => {
    // target needs casting as no way of knowing what it is
    const target = event.target as HTMLDivElement;

    const cellCopyValue = target.innerText || '';
    const isCell = target.getAttribute('data-is-cell');
    const cellColumnName = target.getAttribute('data-column-name') || '';

    if (isCell === 'true' && cellCopyValue) {
      event.preventDefault();

      this.setState({
        cellColumnName,
        cellCopyValue,
        contextTop: event.clientY,
        contextLeft: event.clientX,
        contextMenuOpen: true,
      });
    }
  };

  handleContextMenuOpenChange = (contextMenuOpen: boolean) => {
    this.setState({ contextMenuOpen });
  };

  handleCellModalClose = () => {
    this.setState({
      cellModalVisible: false,
      cellColumnName: '',
      cellCopyValue: '',
    });
  };

  render() {
    const { columns, rows, queryResultFormat } = this.props;
    const {
      cellModalVisible,
      contextMenuOpen,
      cellColumnName,
      cellCopyValue,
      contextLeft,
      contextTop,
    } = this.state;
    const { height, width } = this.state.dimensions;

    if (rows && columns) {
      const rowCount = rows.length;
      // Add extra column to fill remaining grid width if necessary
      const columnCount = columns.length + 1;
      const gridData: GridData = {
        columns,
        rows,
        columnWidths: this.state.columnWidths,
        width,
        scrollbarWidth: this.state.scrollbarWidth,
        onResizeColumn: this.resizeColumn,
      };

      if (queryResultFormat === 'fullColumns') {
        return (
          <div style={{ overflow: 'auto', height: '100%' }}>
            {rows.map((r, index) => (
              <pre
                key={index}
                style={{
                  margin: 0,
                  padding: '10px',
                  borderBottom:
                    queryResultFormat === 'fullColumns'
                      ? cellStyle.borderBottom
                      : undefined,
                  background: index % 2 !== 0 ? '#f9f9f9' : undefined,
                }}
              >
                {columns.map(({ name }, index) => {
                  const maxCharLength = columns.reduce(
                    (charLength, { name }) => Math.max(name.length, charLength),
                    0,
                  );
                  const value = r[index];
                  return (
                    <div key={name}>
                      <strong>{`${name.padStart(maxCharLength)}: `}</strong>
                      <span>{value}</span>
                    </div>
                  );
                })}
              </pre>
            ))}
          </div>
        );
      }

      return (
        <Measure onResize={this.handleContainerResize}>
          {({ measureRef }) => (
            <div
              ref={measureRef}
              onContextMenu={this.handleContextMenu}
              className="h-100 w-100"
              style={{
                position: 'absolute',
              }}
            >
              {/*
                Visual hack - On Windows, scrollbar always showing in grid takes up some amount of room on side of content.
                To account for this, the header width is reduced by scrollbar width.
                This creates a small space in upper right corner that is unstyled.
                Visually, we want this to look like a continuation of the header row, so we render a div out of flow, behind the actual header
              */}
              <div
                style={{
                  ...headerCellStyle,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 30,
                }}
              />

              {/* Input fields for copy-paste value sourcing */}
              <OffScreenInput id="cell-copy-value" value={cellCopyValue} />

              <Grid
                columnCount={columnCount}
                rowCount={1}
                columnWidth={QueryResultDataTable.getColumnWidth}
                rowHeight={30}
                gridRef={this.headerGrid}
                cellComponent={QueryResultDataTable.HeaderCell}
                cellProps={gridData}
                style={{
                  ...headerStyle,
                  height: 30,
                  width: Math.max(0, width - this.state.scrollbarWidth),
                }}
              />
              <Grid
                columnCount={columnCount}
                rowCount={rowCount}
                columnWidth={QueryResultDataTable.getColumnWidth}
                rowHeight={QueryResultDataTable.getRowHeight}
                cellComponent={QueryResultDataTable.Cell}
                cellProps={gridData}
                onScroll={this.handleGridScroll}
                style={{
                  ...bodyStyle,
                  height: Math.max(0, height - 30),
                  width: Math.max(0, width),
                }}
              />

              <PositionedMenu
                open={contextMenuOpen}
                onOpenChange={this.handleContextMenuOpenChange}
                left={contextLeft}
                top={contextTop}
              >
                <CopyMenuItem id="#cell-copy-value" value={cellCopyValue} />
                <MenuItem
                  onSelect={() => {
                    this.setState({ cellModalVisible: true });
                  }}
                >
                  View expanded value
                </MenuItem>
              </PositionedMenu>

              <Modal
                title={cellColumnName}
                width="fit-content"
                visible={cellModalVisible}
                onClose={this.handleCellModalClose}
              >
                <pre style={{ fontSize: '14px', color: '#000' }}>
                  {cellCopyValue}
                </pre>
              </Modal>
            </div>
          )}
        </Measure>
      );
    }

    return null;
  }
}

export default QueryResultDataTable;
