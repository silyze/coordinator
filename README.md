# Coordinator Interface

A service state coordinator and log collector interface, built on top of an event-driven logging system.

## Installation

```bash
npm install @silyze/coordinator @silyze/logger @silyze/typed-event-target
```

## Overview

The `Coordinator` class provides:

- Typed events for **logs** (`LogEvent`) and **service status changes** (`StatusEvent`).
- A scoped logger (`CoordinatorLogger`) that emits `LogEvent` instances.
- Abstract methods to manage and observe service states.

Use it as a base class for any component that needs to coordinate multiple services and collect their logs in a type-safe, event-driven fashion.

## Basic Usage

```ts
import {
  Coordinator,
  ServiceStatus,
  CoordinatorLog,
} from "@silyze/coordinator";

class MyCoordinator extends Coordinator {
  get url() {
    return "https://api.example.com";
  }

  async setServiceStatus(
    resourceId: string,
    service: string,
    status: ServiceStatus
  ) {
    // update internal state or remote store
    this.dispatchEvent(new StatusEvent(resourceId, service, status));
  }

  async getServiceStatus(
    resourceId: string,
    service: string
  ): Promise<ServiceStatus | null> {
    // retrieve state
    return null;
  }

  async waitForServiceStatus(
    resourceId: string,
    service: string,
    expectedStatus: ServiceStatus
  ) {
    // optional: wait until a StatusEvent matches expectedStatus
  }
}

const coordinator = new MyCoordinator();

// Listen for logs
coordinator.addEventListener("log", (evt) => {
  console.log(`[${evt.log.severity}] ${evt.log.area}: ${evt.log.message}`);
});

// Listen for status changes
coordinator.addEventListener("status", (evt) => {
  console.log(`Service ${evt.service} is now ${evt.status}`);
});

// Create a scoped logger
const logger = coordinator.createLogger("resource-123");
logger.log({
  severity: "info",
  area: "startup",
  message: "Coordinator started",
});

// Emit a service status
await coordinator.setServiceStatus("resource-123", "database", "running");
```

## API Reference

### Types

- **`ServiceStatus`**: `"running" | "stopped"`
- **`CoordinatorLog`**:

  ```ts
  interface CoordinatorLog {
    context: LoggerContext;
    severity: LogSeverity;
    message: string;
    area: string;
    object?: unknown;
  }
  ```

### Classes

#### `class LogEvent extends Event`

Emitted when a log entry is created.

- **Properties**:

  - `resourceId: string | undefined`
  - `log: CoordinatorLog`
  - `shouldDistribute: boolean`

#### `class StatusEvent extends Event`

Emitted when a service status changes.

- **Properties**:

  - `resourceId: string`
  - `service: string`
  - `status: ServiceStatus`

#### `abstract class Coordinator` implements `TypedEventTarget<LogEvent | StatusEvent, "log" | "status">`

Base class for coordinating services and collecting logs.

- **Event Methods**:

  - `addEventListener(type: "log" | "status", listener): void`
  - `removeEventListener(type: "log" | "status", listener): void`
  - `dispatchEvent(event: LogEvent | StatusEvent): boolean`

- **Abstract Methods** (must be implemented):

  - `setServiceStatus(resourceId: string, service: string, status: ServiceStatus): Promise<void>`
  - `getServiceStatus(resourceId: string, service: string): Promise<ServiceStatus | null>`
  - `waitForServiceStatus(resourceId: string, service: string, expectedStatus: ServiceStatus): Promise<void>`
  - `get url(): string`

- **Helper**:

  - `createLogger(resourceId?: string, ...loggers: Logger[]): Logger`

    - Returns a combined logger that emits `LogEvent`s and delegates to any provided `Logger` instances.
