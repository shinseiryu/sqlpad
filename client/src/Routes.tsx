import React, { useEffect, useMemo } from 'react';
import { createBrowserRouter, Navigate, RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import PasswordReset from './pages/PasswordReset';
import PasswordResetRequested from './pages/PasswordResetRequested';
import QueryChartOnly from './pages/QueryChartOnly';
import QueryEditorWrapper from './pages/QueryEditorWrapper';
import QueryTableOnly from './pages/QueryTableOnly';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import { setRouter } from './utilities/navigation';
import useAppContext from './utilities/use-app-context';

// Only auth related routes are available when not signed in
const signedOutRoutes: RouteObject[] = [
  { path: '/signin', element: <SignIn /> },
  { path: '/signup', element: <SignUp /> },
  { path: '/password-reset/:passwordResetId', element: <PasswordReset /> },
  { path: '/password-reset', element: <PasswordResetRequested /> },
  // If nothing matches redirect to signin
  { path: '*', element: <Navigate to="/signin" replace /> },
];

const signedInRoutes: RouteObject[] = [
  // Static /queries/new ranks above /queries/:queryId, so no queryId is captured
  { path: '/queries/new', element: <QueryEditorWrapper /> },
  { path: '/queries/:queryId', element: <QueryEditorWrapper /> },
  { path: '/query-table/:queryId', element: <QueryTableOnly /> },
  { path: '/query-chart/:queryId', element: <QueryChartOnly /> },
  // If nothing matches redirect to new query
  { path: '*', element: <Navigate to="/queries/new" replace /> },
];

function Routes() {
  const { config, currentUser } = useAppContext();
  const baseUrl = config?.baseUrl;
  const signedIn = Boolean(currentUser);

  // A data router is required for useBlocker (see EditorNavProtection).
  // Recreate it when the base URL or signed in state changes.
  const router = useMemo(() => {
    if (baseUrl === undefined) {
      return undefined;
    }
    return createBrowserRouter(signedIn ? signedInRoutes : signedOutRoutes, {
      basename: baseUrl || '/',
    });
  }, [baseUrl, signedIn]);

  useEffect(() => {
    setRouter(router);
    return () => {
      setRouter(undefined);
      router?.dispose();
    };
  }, [router]);

  // Config is needed in order to mount app at proper basename
  if (!router) {
    return null;
  }

  return <RouterProvider router={router} />;
}

export default Routes;
