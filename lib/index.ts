import {
  combineLoggers,
  Logger,
  LogSeverity,
  LoggerContext,
} from "@silyze/logger";
import createEventTarget, {
  TypedEventTarget,
  TypedEventListenerOrEventListenerObject,
} from "@silyze/typed-event-target";

export type ServiceStatus = "running" | "stopped";

export interface CoordinatorLog {
  context: LoggerContext;
  severity: LogSeverity;
  message: string;
  area: string;
  object?: unknown;
}

export class LogEvent extends Event {
  #resourceId: string | undefined;
  #log: CoordinatorLog;
  #shouldDistribute: boolean;
  get resourceId() {
    return this.#resourceId;
  }

  get log() {
    return this.#log;
  }

  get shouldDistribute() {
    return this.#shouldDistribute;
  }

  constructor(
    resourceId: string | undefined,
    log: CoordinatorLog,
    shouldDistribute: boolean = false
  ) {
    super("log");
    this.#resourceId = resourceId;
    this.#log = log;
    this.#shouldDistribute = shouldDistribute;
  }
}

export class StatusEvent extends Event {
  #resourceId: string;
  #service: string;
  #status: ServiceStatus;

  get resourceId() {
    return this.#resourceId;
  }

  get service() {
    return this.#service;
  }

  get status() {
    return this.#status;
  }

  constructor(resourceId: string, service: string, status: ServiceStatus) {
    super("status");
    this.#resourceId = resourceId;
    this.#service = service;
    this.#status = status;
  }
}

class CoordinatorLogger extends Logger {
  #resourceId: string | undefined;
  #coordinator: Coordinator;
  constructor(resourceId: string | undefined, coordinator: Coordinator) {
    super();
    this.#resourceId = resourceId;
    this.#coordinator = coordinator;
  }
  log<T>(
    severity: LogSeverity,
    area: string,
    message: string,
    object?: T,
    context?: LoggerContext
  ): void {
    context ??= {};
    context.timestamp ??= new Date();
    this.#coordinator.dispatchEvent(
      new LogEvent(
        this.#resourceId,
        {
          severity,
          area,
          message,
          object,
          context,
        },
        true
      )
    );
  }
}

export abstract class Coordinator
  implements TypedEventTarget<LogEvent | StatusEvent, "log" | "status">
{
  #target: TypedEventTarget<LogEvent | StatusEvent, "log" | "status">;
  constructor() {
    this.#target = createEventTarget();
  }
  addEventListener(
    type: "status",
    callback: TypedEventListenerOrEventListenerObject<StatusEvent> | null
  ): void;

  addEventListener(
    type: "log",
    callback: TypedEventListenerOrEventListenerObject<LogEvent> | null
  ): void;

  addEventListener(
    type: "log" | "status",
    callback: TypedEventListenerOrEventListenerObject<
      LogEvent | StatusEvent
    > | null
  ): void {
    return this.#target.addEventListener(type, callback);
  }

  removeEventListener(
    type: "status",
    callback: TypedEventListenerOrEventListenerObject<StatusEvent> | null
  ): void;

  removeEventListener(
    type: "log",
    callback: TypedEventListenerOrEventListenerObject<LogEvent> | null
  ): void;
  removeEventListener(
    type: "log" | "status",
    callback: TypedEventListenerOrEventListenerObject<
      LogEvent | StatusEvent
    > | null
  ): void {
    return this.#target.removeEventListener(type, callback);
  }

  dispatchEvent(event: LogEvent | StatusEvent) {
    return this.#target.dispatchEvent(event);
  }

  abstract setServiceStatus(
    resourceId: string,
    service: string,
    status: ServiceStatus
  ): Promise<void>;

  abstract getServiceStatus(
    resourceId: string,
    service: string
  ): Promise<ServiceStatus | null>;

  abstract waitForServiceStatus(
    resourceId: string,
    service: string,
    expectedStatus: ServiceStatus
  ): Promise<void>;

  abstract get url(): string;

  createLogger(resourceId?: string, ...loggers: Logger[]): Logger {
    const coordinatorLogger = new CoordinatorLogger(
      resourceId,
      this
    ).createScope("", resourceId);

    if (loggers.length) {
      return combineLoggers(coordinatorLogger, ...loggers);
    }

    return coordinatorLogger;
  }
}
