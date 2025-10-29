/**
 * Enum representing the different modes for receiving messages in the application.
 *
 * @enum {string}
 * @property {string} SWARM - Use only Swarm polling for message receiving
 * @property {string} WAKU - Use only Waku real-time messaging for message receiving
 * @property {string} BOTH - Use both Swarm polling and Waku simultaneously
 */
export enum MessageReceiveMode {
  SWARM = 'swarm',
  WAKU = 'waku',
  BOTH = 'both',
}
