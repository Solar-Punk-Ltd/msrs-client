import { useEffect, useRef } from 'react';
import PQueue from 'p-queue';

class QueueRegistry {
  private queues = new Map<string, PQueue>();
  private operationIds = new Map<string, number>();

  getQueue(name: string): PQueue {
    if (!this.queues.has(name)) {
      this.queues.set(name, new PQueue({ concurrency: 1 }));
      this.operationIds.set(name, 0);
    }
    return this.queues.get(name)!;
  }

  getNextOpId(queueName: string): number {
    const current = this.operationIds.get(queueName) || 0;
    const next = current + 1;
    this.operationIds.set(queueName, next);
    return next;
  }

  clearQueue(name: string): void {
    const queue = this.queues.get(name);
    if (queue) {
      queue.clear();
      this.queues.delete(name);
      this.operationIds.delete(name);
    }
  }

  getAllQueues(): Map<string, PQueue> {
    return this.queues;
  }
}

const queueRegistry = new QueueRegistry();

interface QueuedOperation {
  id: number;
  pairId: number;
  type: 'setup' | 'cleanup';
  cancelled: boolean;
}

/**
 * Custom hook that serializes async effects using isolated p-queue instances
 *
 * @param queueName - Unique identifier for this queue (e.g., 'chat', 'file-upload', 'notifications')
 * @param setup - Async function to run on mount/dependency change. Receives `isMounted` callback.
 * @param cleanup - Optional async function to run on unmount/before next setup
 * @param deps - Dependency array
 * @param setLoading - Optional loading state setter. Will be true while operations are queued/running.
 *
 * @example
 * // Chat queue - isolated from other operations
 * useSerializedEffect(
 *   'chat',
 *   async (isMounted) => {
 *     await chat.start();
 *   },
 *   async () => {
 *     await chat.stop();
 *   },
 *   [chatConfig],
 *   setChatLoading
 * );
 *
 * // File upload queue - separate, won't block chat
 * useSerializedEffect(
 *   'file-upload',
 *   async (isMounted) => {
 *     await uploadFile();
 *   },
 *   async () => {
 *     await cancelUpload();
 *   },
 *   [fileId],
 *   setUploadLoading
 * );
 */
export const useSerializedEffect = (
  queueName: string,
  setup: (isMounted: () => boolean) => Promise<void> | void,
  cleanup?: () => Promise<void> | void,
  deps: React.DependencyList = [],
  setLoading?: (loading: boolean) => void,
): void => {
  const opIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const pendingOpsRef = useRef(0);
  const queuedOperationsRef = useRef<Map<number, QueuedOperation>>(new Map());
  const currentExecutingOpRef = useRef<number | null>(null);
  const componentMountedRef = useRef(true);

  const queue = queueRegistry.getQueue(queueName);

  // Component-level unmount cleanup
  useEffect(() => {
    componentMountedRef.current = true;

    return () => {
      componentMountedRef.current = false;

      console.log(`🗑️  [${queueName}] Component unmounting - cancelling pending operations`);

      const currentExecOp = currentExecutingOpRef.current;
      const currentPairId = currentExecOp ? queuedOperationsRef.current.get(currentExecOp)?.pairId : null;

      queuedOperationsRef.current.forEach((op, id) => {
        if (currentPairId !== null && op.pairId === currentPairId) {
          console.log(`  ✅ [${queueName}] Keeping Op ${id} (current pair: ${currentPairId})`);
          return;
        }

        op.cancelled = true;
        console.log(`  ❌ [${queueName}] Cancelled Op ${id} (pair: ${op.pairId}, type: ${op.type})`);
      });
    };
  }, [queueName]);

  useEffect(() => {
    isMountedRef.current = true;

    const myOpId = queueRegistry.getNextOpId(queueName);
    const pairId = Math.floor(myOpId / 2);
    opIdRef.current = myOpId;

    const isMounted = () => isMountedRef.current;

    console.log(`📋 [${queueName}:Op ${myOpId}] Queued for execution (pair: ${pairId})`);
    console.log(`   [${queueName}] Queue size: ${queue.size}, Pending: ${queue.pending}`);

    const setupOp: QueuedOperation = {
      id: myOpId,
      pairId,
      type: 'setup',
      cancelled: false,
    };
    queuedOperationsRef.current.set(myOpId, setupOp);

    pendingOpsRef.current++;
    if (setLoading && pendingOpsRef.current === 1) {
      setLoading(true);
      console.log(`⏳ [${queueName}:Op ${myOpId}] Loading started (pending: ${pendingOpsRef.current})`);
    }

    queue
      .add(async () => {
        if (setupOp.cancelled) {
          console.log(`⏭️  [${queueName}:Op ${myOpId}] Setup skipped (cancelled)`);
          return;
        }

        if (!componentMountedRef.current) {
          console.log(`⏭️  [${queueName}:Op ${myOpId}] Setup skipped (component unmounted)`);
          return;
        }

        if (!isMountedRef.current) {
          console.log(`⏭️  [${queueName}:Op ${myOpId}] Setup skipped (effect unmounted)`);
          return;
        }

        currentExecutingOpRef.current = myOpId;

        console.log(`🚀 [${queueName}:Op ${myOpId}] Setup starting...`);
        try {
          await setup(isMounted);
          console.log(`✅ [${queueName}:Op ${myOpId}] Setup completed`);
        } catch (error) {
          console.error(`❌ [${queueName}:Op ${myOpId}] Setup failed:`, error);
          throw error;
        } finally {
          if (currentExecutingOpRef.current === myOpId) {
            currentExecutingOpRef.current = null;
          }
        }
      })
      .catch((error) => {
        console.error(`❌ [${queueName}:Op ${myOpId}] Queue error:`, error);
      })
      .finally(() => {
        pendingOpsRef.current--;
        queuedOperationsRef.current.delete(myOpId);
        console.log(`   [${queueName}:Op ${myOpId}] Setup finished (pending: ${pendingOpsRef.current})`);

        if (setLoading && pendingOpsRef.current === 0) {
          setLoading(false);
          console.log(`✅ [${queueName}:Op ${myOpId}] Loading finished (all operations complete)`);
        }
      });

    return () => {
      isMountedRef.current = false;

      const cleanupOpId = queueRegistry.getNextOpId(queueName);
      const cleanupOp: QueuedOperation = {
        id: cleanupOpId,
        pairId,
        type: 'cleanup',
        cancelled: false,
      };
      queuedOperationsRef.current.set(cleanupOpId, cleanupOp);

      console.log(`🧹 [${queueName}:Op ${cleanupOpId}] Cleanup queued (pair: ${pairId})`);

      pendingOpsRef.current++;
      if (setLoading && pendingOpsRef.current === 1) {
        setLoading(true);
        console.log(
          `⏳ [${queueName}:Op ${cleanupOpId}] Loading started for cleanup (pending: ${pendingOpsRef.current})`,
        );
      }

      queue
        .add(async () => {
          if (cleanupOp.cancelled) {
            console.log(`⏭️  [${queueName}:Op ${cleanupOpId}] Cleanup skipped (cancelled)`);
            return;
          }

          if (!cleanup) {
            console.log(`⏭️  [${queueName}:Op ${cleanupOpId}] No cleanup function`);
            return;
          }

          currentExecutingOpRef.current = cleanupOpId;

          console.log(`🛑 [${queueName}:Op ${cleanupOpId}] Cleanup starting...`);
          try {
            await cleanup();
            console.log(`✅ [${queueName}:Op ${cleanupOpId}] Cleanup completed`);
          } catch (error) {
            console.error(`❌ [${queueName}:Op ${cleanupOpId}] Cleanup failed:`, error);
          } finally {
            if (currentExecutingOpRef.current === cleanupOpId) {
              currentExecutingOpRef.current = null;
            }
          }
        })
        .catch((error) => {
          console.error(`❌ [${queueName}:Op ${cleanupOpId}] Cleanup queue error:`, error);
        })
        .finally(() => {
          pendingOpsRef.current--;
          queuedOperationsRef.current.delete(cleanupOpId);
          console.log(`   [${queueName}:Op ${cleanupOpId}] Cleanup finished (pending: ${pendingOpsRef.current})`);

          if (setLoading && pendingOpsRef.current === 0) {
            setLoading(false);
            console.log(`✅ [${queueName}:Op ${cleanupOpId}] Loading finished (all operations complete)`);
          }
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
