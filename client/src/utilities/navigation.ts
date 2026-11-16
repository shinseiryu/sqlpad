import type { DataRouter } from 'react-router';

let router: DataRouter | undefined;

/**
 * Register the active router so code outside React components
 * (like editor store actions) can navigate.
 */
export function setRouter(nextRouter: DataRouter | undefined) {
  router = nextRouter;
}

/**
 * Navigate to an app path (relative to the base URL).
 * No-op if no router is mounted.
 */
export function navigate(to: string) {
  router?.navigate(to);
}
