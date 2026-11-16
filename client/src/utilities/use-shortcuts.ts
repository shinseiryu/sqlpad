import { useEffect } from 'react';
import { tinykeys } from 'tinykeys';
import {
  connectConnectionClient,
  formatQuery,
  runQuery,
  saveQuery,
} from '../stores/editor-actions';

function useShortcuts() {
  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      event.preventDefault();
      saveQuery();
    };
    const run = (event: KeyboardEvent) => {
      event.preventDefault();
      connectConnectionClient().then(() => runQuery());
    };

    // Ctrl and Cmd are both bound on every platform, as before.
    // Shortcuts fire from any element, including the editor and inputs
    // (tinykeys ignores form elements by default).
    return tinykeys(
      window,
      {
        'Control+s': save,
        'Meta+s': save,
        'Control+Enter': run,
        'Meta+Enter': run,
        'Shift+Enter': (event) => {
          event.preventDefault();
          formatQuery();
        },
      },
      { ignore: () => false },
    );
  }, []);
}

export default useShortcuts;
