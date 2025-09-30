import type { HlsConfig, Loader, LoaderCallbacks, LoaderConfiguration, PlaylistLoaderContext } from 'hls.js';
import Hls from 'hls.js';

import { ManifestFetcher } from './ManifestManagement';

const manifestFetcher = new ManifestFetcher();

const PlaylistLoader = Hls.DefaultConfig.loader as unknown as {
  new (config: HlsConfig): Loader<PlaylistLoaderContext>;
};

export class CustomManifestLoader extends PlaylistLoader {
  constructor(config: HlsConfig) {
    super(config);
  }

  load(context: PlaylistLoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<PlaylistLoaderContext>) {
    if (['manifest', 'level'].includes(context.type)) {
      manifestFetcher
        .fetch(context.url)
        .then((manifest) => {
          const response = {
            url: context.url,
            data: manifest,
            code: 200,
          };
          callbacks.onSuccess(response, this.stats, context, undefined);
        })
        .catch((error) => {
          callbacks.onError?.({ code: 0, text: error.message }, context, undefined, this.stats);
        });
    } else {
      super.load(context, config, callbacks);
    }
  }
}
