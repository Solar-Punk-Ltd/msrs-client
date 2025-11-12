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

      const currentExecOp = currentExecutingOpRef.current;
      const currentPairId = currentExecOp ? queuedOperationsRef.current.get(currentExecOp)?.pairId : null;

      queuedOperationsRef.current.forEach((op) => {
        if (currentPairId !== null && op.pairId === currentPairId) {
          return;
        }

        op.cancelled = true;
      });
    };
  }, [queueName]);

  useEffect(() => {
    isMountedRef.current = true;

    const myOpId = queueRegistry.getNextOpId(queueName);
    const pairId = Math.floor(myOpId / 2);
    opIdRef.current = myOpId;

    const isMounted = () => isMountedRef.current;

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
    }

    queue
      .add(async () => {
        if (setupOp.cancelled) {
          return;
        }

        if (!componentMountedRef.current) {
          return;
        }

        if (!isMountedRef.current) {
          return;
        }

        currentExecutingOpRef.current = myOpId;

        try {
          await setup(isMounted);
        } catch (error) {
          console.error(`[${queueName}] Setup failed:`, error);
          throw error;
        } finally {
          if (currentExecutingOpRef.current === myOpId) {
            currentExecutingOpRef.current = null;
          }
        }
      })
      .catch((error) => {
        console.error(`[${queueName}] Queue error:`, error);
      })
      .finally(() => {
        pendingOpsRef.current--;
        queuedOperationsRef.current.delete(myOpId);

        if (setLoading && pendingOpsRef.current === 0) {
          setLoading(false);
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

      pendingOpsRef.current++;
      if (setLoading && pendingOpsRef.current === 1) {
        setLoading(true);
      }

      queue
        .add(async () => {
          if (cleanupOp.cancelled) {
            return;
          }

          if (!cleanup) {
            return;
          }

          currentExecutingOpRef.current = cleanupOpId;

          try {
            await cleanup();
          } catch (error) {
            console.error(`[${queueName}] Cleanup failed:`, error);
          } finally {
            if (currentExecutingOpRef.current === cleanupOpId) {
              currentExecutingOpRef.current = null;
            }
          }
        })
        .catch((error) => {
          console.error(`[${queueName}] Cleanup queue error:`, error);
        })
        .finally(() => {
          pendingOpsRef.current--;
          queuedOperationsRef.current.delete(cleanupOpId);

          if (setLoading && pendingOpsRef.current === 0) {
            setLoading(false);
          }
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
