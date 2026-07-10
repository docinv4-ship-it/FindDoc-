interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

const errorQueue: ErrorLog[] = [];
const MAX_QUEUE_SIZE = 50;

export function logError(
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    message: typeof error === "string" ? error : error.message,
    stack: typeof error === "string" ? undefined : error.stack,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    context,
  };

  errorQueue.push(errorLog);
  if (errorQueue.length > MAX_QUEUE_SIZE) {
    errorQueue.shift();
  }

  if (process.env.NODE_ENV === "development") {
    console.error("[Error]", errorLog.message, context || "");
  }

  sendToMonitoringService(errorLog);
}

export function logApiError(
  endpoint: string,
  status: number,
  message: string,
  context?: Record<string, unknown>
): void {
  logError(`API Error [${status}] ${endpoint}: ${message}`, {
    endpoint,
    status,
    ...context,
  });
}

async function sendToMonitoringService(errorLog: ErrorLog): Promise<void> {
  try {
    await fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorLog),
    });
  } catch {
    // Silently fail - don't create infinite loops
  }
}

export function getErrorQueue(): ErrorLog[] {
  return [...errorQueue];
}

export function clearErrorQueue(): void {
  errorQueue.length = 0;
}

export function setupErrorMonitoring(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    logError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logError(event.reason || "Unhandled Promise Rejection", {
      type: "unhandledrejection",
    });
  });
}
