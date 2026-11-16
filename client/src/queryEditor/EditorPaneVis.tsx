import React, { FunctionComponent, ReactElement } from 'react';
import { SplitGroup, SplitPane, SplitSeparator } from '../common/SplitPanes';
import { useSessionChartType } from '../stores/editor-store';
import QueryEditorChart from './QueryEditorChart';
import QueryEditorChartToolbar from './QueryEditorChartToolbar';

interface EditorPaneVisProps {
  children: ReactElement;
}

const EditorPaneVis: FunctionComponent<EditorPaneVisProps> = ({
  children,
}: EditorPaneVisProps) => {
  const chartType = useSessionChartType();
  const showVis = Boolean(chartType);

  if (!showVis) {
    return children;
  }

  return (
    <SplitGroup key="editorAndVis" orientation="horizontal">
      <SplitPane defaultSize="50%">{children}</SplitPane>
      <SplitSeparator />
      <SplitPane minSize={200}>
        <div style={{ position: 'absolute' }} className="h-100 w-100">
          <QueryEditorChartToolbar>
            <QueryEditorChart />
          </QueryEditorChartToolbar>
        </div>
      </SplitPane>
    </SplitGroup>
  );
};

export default EditorPaneVis;
