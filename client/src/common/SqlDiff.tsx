import React from 'react';
import { useElementSize } from '../utilities/use-element-size';
import { diff as DiffEditor } from 'react-ace';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-sqlserver';

export interface Props {
  value?: string[];
}

function SqlDiff({ value = ['', ''] }: Props) {
  const [measureRef, dimensions] = useElementSize();
  const { width, height } = dimensions;

  // DiffEditor isn't responding to size changes or initial measure
  // As a workaround, setting the key based on size will ensure React re-renders it
  const key = `${width}${height}`;

  return (
    <div ref={measureRef} className="h-100 w-100">
      <DiffEditor
        key={key}
        focus={false}
        editorProps={{ $blockScrolling: Infinity }}
        height={`${height}px`}
        mode="sql"
        name="query-diff-ace-editor"
        theme="sqlserver"
        readOnly={true}
        value={value}
        width={`${width}px`}
      />
    </div>
  );
}

export default SqlDiff;
