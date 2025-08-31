import { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';

import { MainLayout } from './layouts/Main/MainLayout';
import { StreamBrowser } from './pages/StreamBrowser/StreamBrowser';
import { StreamForm } from './pages/StreamForm/StreamForm';
import { StreamManager } from './pages/StreamManager/StreamManager';
import { StreamWatcher } from './pages/StreamWatcher/StreamWatcher';

export enum ROUTES {
  STREAM_BROWSER = '/',
  STREAM_WATCH = '/watch/:mediatype/:owner/:topic/:state?',
  STREAM_CREATE = '/create',
  STREAM_EDIT = '/edit/:owner/:topic',
  STREAM_MANAGER = '/manage',
}

const BaseRouter = (): ReactElement => {
  return (
    <MainLayout>
      <Routes>
        <Route path={ROUTES.STREAM_BROWSER} element={<StreamBrowser />} />
        <Route path={ROUTES.STREAM_WATCH} element={<StreamWatcher />} />
        <Route path={ROUTES.STREAM_CREATE} element={<StreamForm />} />
        <Route path={ROUTES.STREAM_EDIT} element={<StreamForm />} />
        <Route path={ROUTES.STREAM_MANAGER} element={<StreamManager />} />
      </Routes>
    </MainLayout>
  );
};

export default BaseRouter;
