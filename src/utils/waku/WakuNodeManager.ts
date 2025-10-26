import { createLightNode, HealthStatus, type LightNode, WakuEvent } from '@solarpunkltd/waku-sdk';

import { config } from '../shared/config';

enum HealthRecoveryType {
  Minimal = 'minimal',
  Unhealthy = 'unhealthy',
}

interface NodeHealthListener {
  onNodeReady: (node: LightNode) => void;
  onNodeLost: () => void;
}

export class WakuNodeManager {
  private static instance: WakuNodeManager;

  private wakuNode: LightNode | null = null;
  private setupPromise: Promise<LightNode> | null = null;

  private healthChangeListener: ((event: Event) => void) | null = null;
  private listeners: Set<NodeHealthListener> = new Set();

  private currentHealth: HealthStatus = HealthStatus.Unhealthy;

  private isRecovering = false;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private static readonly RECOVERY_DELAY_MINIMAL = 5000;
  private static readonly RECOVERY_DELAY_UNHEALTHY = 10000;
  private static readonly RECOVERY_CHECK_INTERVAL = 2000;

  private constructor() {}

  public static getInstance(): WakuNodeManager {
    if (!WakuNodeManager.instance) {
      WakuNodeManager.instance = new WakuNodeManager();
    }
    return WakuNodeManager.instance;
  }

  public addListener(listener: NodeHealthListener): () => void {
    this.listeners.add(listener);

    if (this.wakuNode && this.currentHealth === HealthStatus.SufficientlyHealthy) {
      listener.onNodeReady(this.wakuNode);
    }

    return () => this.listeners.delete(listener);
  }

  public async setupWakuNode(): Promise<LightNode> {
    if (this.wakuNode) {
      return this.wakuNode;
    }

    if (this.setupPromise) {
      return this.setupPromise;
    }

    this.setupPromise = (async () => {
      try {
        const node = await createLightNode({
          bootstrapPeers: config.wakuStaticPeer ? [config.wakuStaticPeer] : undefined,
          defaultBootstrap: !!config.wakuStaticPeer,
          discovery: {
            dns: false,
            peerExchange: true,
            peerCache: true,
          },
        });

        this.wakuNode = node;
        this.setupHealthMonitoring();

        this.setupPromise = null;

        return this.wakuNode;
      } catch (error) {
        this.setupPromise = null;
        throw error;
      }
    })();

    return this.setupPromise;
  }

  public getWakuNode(): LightNode | null {
    return this.wakuNode;
  }

  private setupHealthMonitoring(): void {
    if (!this.wakuNode?.events) return;

    if (this.healthChangeListener) {
      this.wakuNode.events.removeEventListener(WakuEvent.Health, this.healthChangeListener);
    }

    this.healthChangeListener = (event: Event) => {
      this.handleHealthChange((event as CustomEvent).detail);
    };

    this.wakuNode.events.addEventListener(WakuEvent.Health, this.healthChangeListener);
  }

  private handleHealthChange(health: HealthStatus): void {
    if (this.currentHealth === health) return;

    this.currentHealth = health;

    switch (health) {
      case HealthStatus.SufficientlyHealthy:
        this.clearRecoveryInterval();
        this.isRecovering = false;

        if (this.wakuNode) {
          this.notifyNodeReady(this.wakuNode);
        }
        break;
      case HealthStatus.MinimallyHealthy:
        if (!this.isRecovering) {
          this.attemptHealthRecovery(HealthRecoveryType.Minimal);
        }
        break;
      case HealthStatus.Unhealthy:
        if (!this.isRecovering) {
          this.attemptHealthRecovery(HealthRecoveryType.Unhealthy);
        }
        break;
    }
  }

  private async attemptHealthRecovery(healthType: HealthRecoveryType): Promise<void> {
    if (this.isRecovering) return;

    this.isRecovering = true;

    console.log(`[WakuNodeManager] Starting recovery process due to ${healthType} health`);

    const recoveryDelay =
      healthType === HealthRecoveryType.Unhealthy
        ? WakuNodeManager.RECOVERY_DELAY_UNHEALTHY
        : WakuNodeManager.RECOVERY_DELAY_MINIMAL;

    await this.sleep(recoveryDelay);

    if (this.wakuNode && this.currentHealth === HealthStatus.SufficientlyHealthy) {
      this.isRecovering = false;
      return;
    }

    this.notifyNodeLost();

    if (!this.wakuNode) {
      this.isRecovering = false;
      return;
    }

    console.log('[WakuNodeManager] Performing node recovery...');

    let checkCount = 0;
    const maxChecks = 5;

    const checkInterval = setInterval(async () => {
      checkCount++;

      if (this.currentHealth === HealthStatus.SufficientlyHealthy) {
        clearInterval(checkInterval);
        this.isRecovering = false;
        if (this.wakuNode) {
          this.notifyNodeReady(this.wakuNode);
        }
        return;
      }

      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
        await this.performNodeRecovery();
        this.isRecovering = false;
        return;
      }
    }, WakuNodeManager.RECOVERY_CHECK_INTERVAL);
  }

  private notifyNodeReady(node: LightNode): void {
    this.listeners.forEach((listener) => listener.onNodeReady(node));
  }

  private notifyNodeLost(): void {
    this.listeners.forEach((listener) => listener.onNodeLost());
  }

  private clearRecoveryInterval(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
  }

  private async performNodeRecovery(): Promise<void> {
    const savedListeners = Array.from(this.listeners);

    await this.cleanupNode();
    await this.setupWakuNode();

    this.listeners.clear();
    savedListeners.forEach((listener) => {
      this.listeners.add(listener);
    });

    console.log(`[WakuNodeManager] Restored ${savedListeners.length} listeners after recovery`);
  }

  private async cleanupNode(): Promise<void> {
    if (this.healthChangeListener && this.wakuNode?.events) {
      this.wakuNode.events.removeEventListener(WakuEvent.Health, this.healthChangeListener);
      this.healthChangeListener = null;
    }

    if (this.wakuNode) {
      try {
        await this.wakuNode.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.wakuNode = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public cleanListeners(): void {
    this.listeners.clear();
  }

  public async destroy(): Promise<void> {
    this.clearRecoveryInterval();
    this.isRecovering = false;

    await this.cleanupNode();
    this.listeners.clear();

    this.currentHealth = HealthStatus.Unhealthy;
    this.wakuNode = null;
    this.setupPromise = null;
  }
}
