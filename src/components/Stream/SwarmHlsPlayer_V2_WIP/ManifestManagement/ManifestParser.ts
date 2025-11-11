export class ManifestParser {
  static getSegmentLines(manifest: string): string[] {
    const lines = manifest.trim().split('\n');
    const segments: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF')) {
        const extinf = lines[i];
        const uri = lines[i + 1];
        if (uri && !uri.startsWith('#')) {
          segments.push(extinf + '\n' + uri);
        }
      }
    }
    return segments;
  }

  static getHeaderLines(manifest: string): string[] {
    const lines = manifest.trim().split('\n');
    const headers: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXTINF')) break;
      headers.push(trimmed);
    }
    return headers;
  }

  static isVOD(manifest: string): boolean {
    return manifest.includes('#EXT-X-ENDLIST');
  }

  static mergeManifests(oldManifest: string, newManifest: string): string | null {
    if (this.isVOD(oldManifest)) return null;

    if (this.isVOD(newManifest)) return newManifest;

    if (!oldManifest) return newManifest;

    const oldSegments = this.getSegmentLines(oldManifest);
    const newSegments = this.getSegmentLines(newManifest);

    const isSegmentListSame =
      oldSegments.length === newSegments.length && oldSegments.every((line, i) => line === newSegments[i]);

    if (isSegmentListSame) return null;

    const lastKnownUri = oldSegments.at(-1);
    const indexOfLast = lastKnownUri ? newSegments.indexOf(lastKnownUri) : -1;

    const newOnly =
      indexOfLast >= 0 && indexOfLast < newSegments.length - 1
        ? newSegments.slice(indexOfLast + 1)
        : indexOfLast === newSegments.length - 1
        ? []
        : newSegments;

    if (newOnly.length === 0) return null;

    const existingHeader = this.getHeaderLines(oldManifest);
    const headerHasPlaylistType = existingHeader.some((line) => line.startsWith('#EXT-X-PLAYLIST-TYPE'));

    // Add EVENT playlist type if not present for proper HLS live streaming
    const playlistHeader = headerHasPlaylistType ? existingHeader : [...existingHeader, '#EXT-X-PLAYLIST-TYPE:EVENT'];

    const combinedSegments = oldSegments.concat(newOnly);
    return [...playlistHeader, ...combinedSegments].join('\n');
  }
}
