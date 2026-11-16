import React, { FunctionComponent, ReactElement } from 'react';
import { SplitGroup, SplitPane, SplitSeparator } from '../common/SplitPanes';
import Spacer from '../common/Spacer';
import { useSessionShowVisProperties } from '../stores/editor-store';
import ChartInputs from './ChartInputs';
import ChartStatementDisclaimer from './ChartStatementDisclaimer';
import ChartTypeSelect from './ChartTypeSelect';

interface EditorPaneRightSidebarProps {
  children: ReactElement;
}

const EditorPaneRightSidebar = ({ children }: EditorPaneRightSidebarProps) => {
  const showVisProperties = useSessionShowVisProperties();

  let sidebarContent = null;

  if (showVisProperties) {
    sidebarContent = (
      <div style={{ position: 'absolute', padding: 8 }} className="h-100 w-100">
        <ChartStatementDisclaimer />
        <ChartTypeSelect />
        <Spacer size={2} />
        <ChartInputs />
      </div>
    );
  }

  if (!sidebarContent) {
    return children;
  }

  return (
    <SplitGroup orientation="horizontal">
      <SplitPane>{children}</SplitPane>
      <SplitSeparator />
      <SplitPane
        defaultSize={260}
        minSize={160}
        maxSize={400}
        groupResizeBehavior="preserve-pixel-size"
      >
        {sidebarContent}
      </SplitPane>
    </SplitGroup>
  );
};

export default EditorPaneRightSidebar;
