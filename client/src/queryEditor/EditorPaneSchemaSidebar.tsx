import React, { FunctionComponent, ReactElement } from 'react';
import { SplitGroup, SplitPane, SplitSeparator } from '../common/SplitPanes';
import { debouncedResizeChart } from '../common/tauChartRef';
import SchemaSidebar from '../schema/SchemaSidebar';
import { useSessionShowSchema } from '../stores/editor-store';

interface EditorPaneSchemaSidebarProps {
  queryId: string;
  children: ReactElement;
}

const EditorPaneSchemaSidebar = ({
  children,
  queryId,
}: EditorPaneSchemaSidebarProps) => {
  const showSchema = useSessionShowSchema();

  if (!showSchema) {
    return children;
  }

  return (
    <SplitGroup
      orientation="horizontal"
      onResize={() => debouncedResizeChart(queryId)}
    >
      <SplitPane
        defaultSize={260}
        minSize={150}
        groupResizeBehavior="preserve-pixel-size"
      >
        <SchemaSidebar />
      </SplitPane>
      <SplitSeparator />
      <SplitPane minSize={100}>{children}</SplitPane>
    </SplitGroup>
  );
};

export default EditorPaneSchemaSidebar;
