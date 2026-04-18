type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...extra,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(correlationId?: string) {
  const base = correlationId ? { correlationId } : {};
  return {
    info(msg: string, extra?: Record<string, unknown>) {
      write("info", msg, { ...base, ...extra });
    },
    warn(msg: string, extra?: Record<string, unknown>) {
      write("warn", msg, { ...base, ...extra });
    },
    error(msg: string, extra?: Record<string, unknown>) {
      write("error", msg, { ...base, ...extra });
    },
  };
}
