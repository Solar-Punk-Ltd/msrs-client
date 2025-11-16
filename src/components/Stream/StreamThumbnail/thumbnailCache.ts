import Hls, { Events } from 'hls.js';

import { MediaType, StateType } from '@/types/stream';
import { sleep } from '@/utils/shared/async';
import { fetchThumbnail } from '@/utils/stream/stream';

const THUMBNAIL_CONFIG = {
  VIDEO_LOAD_TIMEOUT_MS: 30000,
  CAPTURE_DELAY_MS: 1000,
} as const;

interface CacheEntry {
  url: string | null;
  loading: boolean;
  error: boolean;
  state?: StateType;
  hasValidFrame: boolean;
  promise?: Promise<string | null>;
}

class ThumbnailCache {
  private cache = new Map<string, CacheEntry>();
  private activeHls = new Map<string, Hls>();

  private getCacheKey(props: { manifestUrl?: string; thumbnailRef?: string; owner: string; topic: string }): string {
    return `${props.owner}:${props.topic}:${props.manifestUrl || ''}:${props.thumbnailRef || ''}`;
  }

  private async captureVideoFrame(video: HTMLVideoElement): Promise<string | null> {
    try {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      return new Promise<string | null>((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob ? URL.createObjectURL(blob) : null);
          },
          'image/jpeg',
          0.9,
        );
      });
    } catch (error) {
      console.error('Error capturing video frame:', error);
      return null;
    }
  }

  private async captureFromHls(manifestUrl: string): Promise<string | null> {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '320px';
    video.style.height = '180px';
    document.body.appendChild(video);

    return new Promise<string | null>((resolve) => {
      let hls: Hls | null = null;
      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;

        if (hls) {
          hls.stopLoad();
          hls.destroy();
          this.activeHls.delete(manifestUrl);
        }
        document.body.removeChild(video);
      };

      const timeoutId = setTimeout(() => {
        console.error('HLS capture timeout for', manifestUrl);
        cleanup();
        resolve(null);
      }, THUMBNAIL_CONFIG.VIDEO_LOAD_TIMEOUT_MS);

      const captureAndResolve = async () => {
        if (resolved) return;

        try {
          await video.play();
          await sleep(1000);

          if (video.duration > 1) {
            await new Promise<void>((resolveSeek) => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolveSeek();
              };
              video.addEventListener('seeked', onSeeked);
              video.currentTime = 1.25;
            });
            await sleep(300);
          }

          video.pause();

          const url = await this.captureVideoFrame(video);
          clearTimeout(timeoutId);
          cleanup();
          resolve(url);
        } catch (error) {
          console.error('Frame capture error:', error);
          clearTimeout(timeoutId);
          cleanup();
          resolve(null);
        }
      };

      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 3,
        maxMaxBufferLength: 5,
        startLevel: -1,
      });

      this.activeHls.set(manifestUrl, hls);

      let dataLoaded = false;

      hls.on(Events.FRAG_BUFFERED, () => {
        if (!dataLoaded && !resolved) {
          dataLoaded = true;
          setTimeout(() => {
            if (!resolved && video.readyState >= 2) {
              captureAndResolve();
            }
          }, THUMBNAIL_CONFIG.CAPTURE_DELAY_MS);
        }
      });

      hls.on(Events.ERROR, (_event: Events.ERROR, data: any) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
          clearTimeout(timeoutId);
          cleanup();
          resolve(null);
        }
      });

      video.onloadeddata = () => {
        if (dataLoaded && !resolved) {
          captureAndResolve();
        }
      };

      video.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
        resolve(null);
      };

      hls.attachMedia(video);
      hls.loadSource(manifestUrl);
      hls.startLoad();
    });
  }

  async getThumbnail(props: {
    manifestUrl: string;
    thumbnailRef?: string;
    owner: string;
    topic: string;
    mediaType: MediaType;
    state?: StateType;
  }): Promise<string | null> {
    const cacheKey = this.getCacheKey(props);
    const existing = this.cache.get(cacheKey);

    const shouldReload =
      existing &&
      !existing.loading &&
      // Was scheduled but now is not, and we don't have a valid frame
      existing.state === StateType.SCHEDULED &&
      props.state !== StateType.SCHEDULED &&
      !existing.hasValidFrame &&
      props.mediaType === MediaType.VIDEO;

    if (existing && !shouldReload) {
      if (existing.loading && existing.promise) {
        return existing.promise;
      }

      return existing.url;
    }

    const entry: CacheEntry = existing || {
      url: null,
      loading: true,
      error: false,
      state: props.state,
      hasValidFrame: false,
    };

    entry.state = props.state;
    entry.loading = true;

    entry.promise = this.loadThumbnail(props, entry);
    this.cache.set(cacheKey, entry);

    const result = await entry.promise;

    entry.url = result;
    entry.loading = false;
    entry.error = !result;
    delete entry.promise;

    return result;
  }

  private async loadThumbnail(
    props: {
      manifestUrl: string;
      thumbnailRef?: string;
      mediaType: MediaType;
      state?: StateType;
    },
    entry: CacheEntry,
  ): Promise<string | null> {
    const { manifestUrl, thumbnailRef, mediaType, state } = props;

    if (state === StateType.SCHEDULED || mediaType === MediaType.AUDIO) {
      if (thumbnailRef) {
        try {
          const url = (await fetchThumbnail(thumbnailRef, { url: true })) as string;
          if (url) {
            entry.hasValidFrame = false; // This is not a captured frame
          }
          return url || null;
        } catch (error) {
          console.error('Error fetching thumbnail:', error);
        }
      }
      return null;
    }

    // For video: try fetched thumbnail first
    if (thumbnailRef) {
      try {
        const url = (await fetchThumbnail(thumbnailRef, { url: true })) as string;
        if (url) {
          entry.hasValidFrame = false;
          return url;
        }
      } catch (error) {
        console.error('Error fetching thumbnail:', error);
      }
    }

    // Fallback to HLS capture for video
    if (mediaType === MediaType.VIDEO && manifestUrl) {
      const capturedUrl = await this.captureFromHls(manifestUrl);
      if (capturedUrl) {
        entry.hasValidFrame = true;
      }
      return capturedUrl;
    }

    return null;
  }

  invalidateIfScheduled(props: { manifestUrl?: string; thumbnailRef?: string; owner: string; topic: string }): void {
    const cacheKey = this.getCacheKey(props);
    const entry = this.cache.get(cacheKey);

    if (entry && entry.state === StateType.SCHEDULED && !entry.hasValidFrame) {
      entry.state = undefined;
    }
  }

  clearEntry(props: { manifestUrl?: string; thumbnailRef?: string; owner: string; topic: string }): void {
    const cacheKey = this.getCacheKey(props);
    const entry = this.cache.get(cacheKey);

    if (entry?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(entry.url);
    }

    this.cache.delete(cacheKey);
  }

  clearAll(): void {
    for (const entry of this.cache.values()) {
      if (entry.url?.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
    }

    for (const hls of this.activeHls.values()) {
      hls.destroy();
    }

    this.cache.clear();
    this.activeHls.clear();
  }
}

export const thumbnailCache = new ThumbnailCache();
