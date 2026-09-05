import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BaseRouter, { ROUTES } from './routes';

vi.mock('./layouts/Main/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./components/AdminGuard/AdminGuard', () => ({
  AdminGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./components/PageLoading/PageLoading', () => ({ PageLoading: () => <div>loading</div> }));
vi.mock('./pages/StreamBrowser/StreamBrowser', () => ({ StreamBrowser: () => <div>page:browser</div> }));
vi.mock('./pages/StreamWatcher/StreamWatcher', () => ({ StreamWatcher: () => <div>page:watcher</div> }));
vi.mock('./pages/StreamForm/StreamForm', () => ({ StreamForm: () => <div>page:form</div> }));
vi.mock('./pages/StreamManager/StreamManager', () => ({ StreamManager: () => <div>page:manager</div> }));
vi.mock('./pages/StampDashboard/StampDashboard', () => ({ StampDashboard: () => <div>page:stamps</div> }));
vi.mock('./pages/StreamUploader/StreamUploader', () => ({ StreamUploader: () => <div>page:uploader</div> }));
vi.mock('./pages/NotFound/NotFound', () => ({ NotFound: () => <div>page:notfound</div> }));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BaseRouter />
    </MemoryRouter>,
  );

describe('routes', () => {
  it('serves the stream uploader page at its route', async () => {
    renderAt(ROUTES.STREAM_UPLOADER);
    expect(await screen.findByText('page:uploader')).toBeInTheDocument();
    expect(screen.queryByText('page:notfound')).not.toBeInTheDocument();
  });

  it('serves the stamp dashboard alone at its route', async () => {
    renderAt(ROUTES.STAMP_DASHBOARD);
    expect(await screen.findByText('page:stamps')).toBeInTheDocument();
    expect(screen.queryByText('page:uploader')).not.toBeInTheDocument();
  });

  it('still falls back to not found for an unknown path', async () => {
    renderAt('/definitely-not-a-route');
    expect(await screen.findByText('page:notfound')).toBeInTheDocument();
  });
});
