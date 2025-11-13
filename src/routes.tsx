import { lazy, ReactElement, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AdminGuard } from './components/AdminGuard/AdminGuard';
import { PageLoading } from './components/PageLoading/PageLoading';
import { MainLayout } from './layouts/Main/MainLayout';

// Lazy load page components for code splitting
const StreamBrowser = lazy(() =>
  import('./pages/StreamBrowser/StreamBrowser').then((m) => ({ default: m.StreamBrowser })),
);
const StreamWatcher = lazy(() =>
  import('./pages/StreamWatcher/StreamWatcher').then((m) => ({ default: m.StreamWatcher })),
);
const StreamForm = lazy(() => import('./pages/StreamForm/StreamForm').then((m) => ({ default: m.StreamForm })));
const StreamManager = lazy(() =>
  import('./pages/StreamManager/StreamManager').then((m) => ({ default: m.StreamManager })),
);
const StampDashboard = lazy(() =>
  import('./pages/StampDashboard/StampDashboard').then((m) => ({ default: m.StampDashboard })),
);
const NotFound = lazy(() => import('./pages/NotFound/NotFound').then((m) => ({ default: m.NotFound })));

export enum ROUTES {
  STREAM_BROWSER = '/',
  STREAM_WATCH = '/watch/:mediatype/:owner/:topic',
  STREAM_CREATE = '/create',
  STREAM_EDIT = '/edit/:owner/:topic',
  STREAM_MANAGER = '/manage',
  STAMP_DASHBOARD = '/stamps',
}

const BaseRouter = (): ReactElement => {
  return (
    <MainLayout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path={ROUTES.STREAM_BROWSER} element={<StreamBrowser />} />
          <Route path={ROUTES.STREAM_WATCH} element={<StreamWatcher />} />
          <Route
            path={ROUTES.STREAM_CREATE}
            element={
              <AdminGuard>
                <StreamForm />
              </AdminGuard>
            }
          />
          <Route
            path={ROUTES.STREAM_EDIT}
            element={
              <AdminGuard>
                <StreamForm />
              </AdminGuard>
            }
          />
          <Route
            path={ROUTES.STREAM_MANAGER}
            element={
              <AdminGuard>
                <StreamManager />
              </AdminGuard>
            }
          />
          <Route
            path={ROUTES.STAMP_DASHBOARD}
            element={
              <AdminGuard>
                <StampDashboard />
              </AdminGuard>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

export default BaseRouter;
