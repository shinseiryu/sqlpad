import DownloadIcon from 'mdi-react/DownloadIcon';
import React from 'react';
import { Link } from 'react-router';
import useAppContext from '../utilities/use-app-context';
import IconMenu from './IconMenu';
import { MenuItem } from './Menu';

function ExportButton({
  statementId,
  onSaveImageClick,
}: {
  statementId?: string;
  onSaveImageClick?: () => void;
}) {
  const { config } = useAppContext();

  if (!config || !statementId) {
    return null;
  }

  const { allowCsvDownload } = config;

  const items = [];

  if (onSaveImageClick) {
    items.push(
      <MenuItem key="png" onSelect={onSaveImageClick}>
        png
      </MenuItem>,
    );
  }

  if (allowCsvDownload) {
    items.push(
      <MenuItem key="csv" asChild>
        <Link
          to={`/statement-results/${statementId}.csv`}
          target="_blank"
          rel="noopener noreferrer"
        >
          csv
        </Link>
      </MenuItem>,
    );
    items.push(
      <MenuItem key="xlsx" asChild>
        <Link
          to={`/statement-results/${statementId}.xlsx`}
          target="_blank"
          rel="noopener noreferrer"
        >
          xlsx
        </Link>
      </MenuItem>,
    );
    items.push(
      <MenuItem key="json" asChild>
        <Link
          to={`/statement-results/${statementId}.json`}
          target="_blank"
          rel="noopener noreferrer"
        >
          json
        </Link>
      </MenuItem>,
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <IconMenu icon={<DownloadIcon aria-label="Download" />}>{items}</IconMenu>
  );
}

export default ExportButton;
