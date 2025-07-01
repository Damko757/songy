import path from "node:path";
import { Worker } from "node:worker_threads";
import chalk, { chalkStderr } from "chalk";
import { WorkerJob, WorkerMessage } from "../Commands/Command.js";
import { Dequeue } from "../../../api/src/Helpers/Dequeue.js";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type DestroyT =
  (typeof WorkerPool.DestroyType)[keyof typeof WorkerPool.DestroyType];

/**
 * Creates pool of workers,
 * each worker can be assigned job from queued jobs. Each worker's event it sent via job.handler
 */
export class WorkerPool {
  static DestroyType = {
    NONE: "none", ///< None - No destroying happening
    FORCE: "force", ///< Force - Imidiate destroying
    FINISH_ALL: "finish-all", ///< Finish-all - Waits for all planned jobs to be finished. No new jobs are scheduled
    FINISH_STARTED: "finish-started", ///< Finish-started - Waits for all started jobs to be finished. Planned jobs are discarded and no new jobs are scheduled
  } as const;

  size: number; ///< Size of workers pool

  protected waitingJobs = new Dequeue<WorkerJob>(); ///< Queue of jobs to run by workers
  protected workers = [] as Worker[]; ///< All workers
  protected idleWorkers = new Dequeue<number>(); ///< Index of idle workers
  protected assignedJobs = new Map<number, WorkerJob>(); ///< WorkerID: WorkerJob

  protected onDestroyCallback: undefined | (() => void) = undefined; ///< If not undefined, destroying is scheduled
  protected destroyType: DestroyT = WorkerPool.DestroyType.NONE;

  constructor(numberOfWorkers: number) {
    if (numberOfWorkers <= 0)
      throw new Error(`Invalid number of workers: ${numberOfWorkers}`);

    this.size = numberOfWorkers;

    this.spawnWorkers(); // Initializing workers
  }

  /**
   * Spawns assigned number of workers
   */
  protected spawnWorkers() {
    if (this.workers.length != 0)
      throw new Error("`spawnWorkers` has been called multiple times");

    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(this.workerScriptFile());

      this.bindWorker(worker, i); // Binding events
      this.workers.push(worker); // Pushing to worker storage
    }
  }

  /**
   * @returns Path for worker's script file
   */
  protected workerScriptFile() {
    return path.resolve(__dirname, "Worker.js");
  }

  /**
   * Binds events to worker
   * @param worker To bind
   */
  protected bindWorker(worker: Worker, workerID: number) {
    worker.on("online", () => {
      console.log(
        chalk.greenBright(`Worker ${chalk.bold.underline(workerID)} is online!`)
      );
      this.idleWorkers.addBack(workerID); // Worker is idle
      this.workerFinished(); // Maybe it should go to work?
    });
    worker.on("message", (message: WorkerMessage) => {
      const job = this.assignedJobs.get(workerID)!;
      const handle = job.handlers[message.type];

      if (handle != undefined) {
        handle(message as any); // Specific handle will get message to process
      }

      if (message.type == "end") {
        this.workerFinished(workerID);
      }
    });
    worker.on("exit", (exitCode) => {
      console.error(
        `Worker ${chalkStderr.bold.underline(
          workerID
        )} exited with code ${chalkStderr.yellow(exitCode)}`
      );
    });
    worker.on("error", console.error);
  }

  /**
   * Called upon worker finishing its job
   * @param workerID ID of worked which ended, undefined if no worker ended, only destroying or dispatching should happen
   */
  protected workerFinished(workerID?: number) {
    if (workerID !== undefined) {
      this.idleWorkers.addBack(workerID); // Worker finished its job
      this.assignedJobs.delete(workerID); // Removing from assignation map
    }

    let dispatchedWorkerID: number | undefined = undefined; // Dispatched worker. If undefined, try to destroy
    if (this.destroyType == "none" || this.destroyType == "finish-all") {
      dispatchedWorkerID = this.dispatchWorker();
    }

    // Should not destroy
    if (this.destroyType == "none" || dispatchedWorkerID !== undefined) return;

    // Not all workers are idle
    if (this.idleWorkers.size != this.size) return;

    // Immidiate worker termination
    Promise.all(this.workers.map((worker) => worker.terminate())).then(() =>
      this.onDestroyCallback?.()
    );
  }

  /**
   * Dispatches idle worker
   * @returns ID of worker which has been dispatched or undefined if none idle or no job
   */
  protected dispatchWorker(): number | undefined {
    // Default condition for undefined
    if (!this.idleWorkers.size || !this.waitingJobs.size) return undefined;

    const job = this.waitingJobs.removeFront()!;
    const workerID = this.idleWorkers.removeFront()!;

    this.assignedJobs.set(workerID, job);
    this.workers[workerID].postMessage(job.job);

    return workerID;
  }

  /**
   * Waits for workers to finish and destroys all workers neatly
   * If `destroyType` is `"force"`, the workers are destroyed immidiately
   * @see WorkerPool.DestroyType
   * @returns Promise resolved when all workers are killed
   */
  destroy(destroyType: DestroyT) {
    return new Promise<void>((resolve, reject) => {
      this.destroyType = destroyType;
      this.onDestroyCallback = () => {
        this.onDestroyCallback = undefined; // Destroying callback
        resolve();
      };

      if (destroyType == "none") {
        // Nothing happens
        this.onDestroyCallback();
        return;
      } else if (destroyType == "force") {
        // Immidiate worker termination
        Promise.all(this.workers.map((worker) => worker.terminate()))
          .then(() => this.onDestroyCallback?.())
          .catch(reject);
        return;
      }

      this.workerFinished();
    });
  }

  /**
   * @returns Type of destroyment
   */
  getDestroyState() {
    return this.destroyType;
  }

  /**
   * @returns If worker pool was destroyed
   * To know if it will be destroyed, @see `getDestroyState()`
   */
  isDestroyed() {
    return this.destroyType == "none" && this.onDestroyCallback === undefined;
  }

  /**
   * Adds new job for workers to execute
   * @param job Job to execute
   * @returns If job has been added to waiting/execution queue
   * Can return false if the WorkerPool is being destroyed
   */
  addJob(job: WorkerJob): boolean {
    if (this.destroyType != "none") return false;

    this.waitingJobs.addBack(job); // Adding job to queue
    this.workerFinished(); // Dispatching potential worker
    return true;
  }
}
