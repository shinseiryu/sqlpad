import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { useMouseOverResultPane } from '../stores/editor-store';

// Guard against accidental navigation away from query results
//
// At this time the only scenario protected against is when the user is scrolling back over query results
// Scrolling too far can trigger the back navigation, which is often undesired
// To protect against this, we track when the mouse is over query results.
// If a back/forward navigation occurs we assume its probably from side scroll.
//
// Only history (POP) navigation is guarded. App navigation, like opening a
// newly saved query, never prompts, even if the hover flag is stale (it can
// stick after the cell context menu, rendered in a portal, closes).
function EditorNavProtection() {
  const mouseOverResultPane = useMouseOverResultPane();
  const blocker = useBlocker(
    ({ historyAction }) => mouseOverResultPane && historyAction === 'POP',
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Are you sure you want to leave?')) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  return null;
}

export default EditorNavProtection;
