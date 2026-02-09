type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

export class Logger {
  private static formatLog(entry: LogEntry): string {
    const { level, message, timestamp, data } = entry;
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`;
  }

  private static log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    const formattedLog = this.formatLog(entry);
    
    switch (level) {
      case "error":
        console.error(formattedLog);
        break;
      case "warn":
        console.warn(formattedLog);
        break;
      case "info":
        console.info(formattedLog);
        break;
      case "debug":
        console.debug(formattedLog);
        break;
    }
  }

  static debug(message: string, data?: any) {
    this.log("debug", message, data);
  }

  static info(message: string, data?: any) {
    this.log("info", message, data);
  }

  static warn(message: string, data?: any) {
    this.log("warn", message, data);
  }

  static error(message: string, data?: any) {
    this.log("error", message, data);
  }

  static request(method: string, url: string, statusCode: number, duration: number) {
    this.info(`${method} ${url}`, {
      statusCode,
      duration: `${duration}ms`,
    });
  }
}

