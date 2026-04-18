import { execFileSync } from "node:child_process";
import si from "systeminformation";

export type MetricsPayload = {
  cpu: { cores: number[] };
  cpuTempC: number | null;
  memory: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  network: {
    interface: string;
    rxBytesPerSec: number;
    txBytesPerSec: number;
  };
  /** Public IPv4/IPv6 from OpenDNS dig, or null if unavailable */
  externalIp: string | null;
  battery: { percent: number; state: string } | null;
};

function readBatteryMac(): { percent: number; state: string } | null {
  try {
    const out = execFileSync("pmset", ["-g", "batt"], {
      encoding: "utf8",
      timeout: 2000,
    });
    const pct = /(\d+)%/.exec(out);
    if (!pct) return null;
    const percent = Number.parseInt(pct[1], 10);
    const status = /;\s*([^;]+);/.exec(out);
    const state = status ? status[1].trim() : "Unknown";
    return { percent, state };
  } catch {
    return null;
  }
}

function readCpuTempFromCli(): number | null {
  const candidates = [
    "/opt/homebrew/bin/osx-cpu-temp",
    "/usr/local/bin/osx-cpu-temp",
    "osx-cpu-temp",
  ];
  for (const cmd of candidates) {
    try {
      const out = execFileSync(cmd, [], {
        encoding: "utf8",
        timeout: 2000,
      }).trim();
      const match = /(-?\d+(?:\.\d+)?)/.exec(out);
      if (!match) continue;
      const value = Number.parseFloat(match[1]);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    } catch {
      // Try next candidate path.
    }
  }
  return null;
}

const EXTERNAL_IP_TTL_MS = 5 * 60 * 1000;
let externalIpCache: { value: string | null; at: number } = { value: null, at: 0 };

function readExternalIpViaDig(): string | null {
  const digCandidates = ["/usr/bin/dig", "dig"];
  for (const cmd of digCandidates) {
    try {
      const out = execFileSync(
        cmd,
        ["+short", "myip.opendns.com", "@resolver1.opendns.com"],
        { encoding: "utf8", timeout: 4000 },
      )
        .trim()
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)[0];
      if (!out) continue;
      if (
        /^[\d.]+$/.test(out) ||
        /^[0-9a-f:.]+$/i.test(out) ||
        (/^[\d.a-f:%]+$/i.test(out) && out.length <= 45 && !/\s/.test(out))
      ) {
        return out;
      }
    } catch {
      // try next dig path
    }
  }
  return null;
}

function getExternalIpCached(): string | null {
  const now = Date.now();
  if (now - externalIpCache.at < EXTERNAL_IP_TTL_MS) {
    return externalIpCache.value;
  }
  const ip = readExternalIpViaDig();
  externalIpCache = { value: ip, at: now };
  return ip;
}

export async function collectMetrics(): Promise<MetricsPayload> {
  const [load, mem, temps, defaultIface] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuTemperature(),
    si.networkInterfaceDefault(),
  ]);

  const coresRaw =
    load.cpus.length > 0
      ? load.cpus
      : [{ load: load.currentLoad ?? load.avgLoad ?? 0 }];
  const cores = coresRaw.map((c) =>
    Math.min(100, Math.max(0, Number.isFinite(c.load) ? c.load : 0)),
  );

  let cpuTempC: number | null = null;
  if (typeof temps.main === "number" && Number.isFinite(temps.main)) {
    cpuTempC = temps.main;
  } else if (typeof temps.max === "number" && Number.isFinite(temps.max)) {
    cpuTempC = temps.max;
  }
  if (cpuTempC == null && process.platform === "darwin") {
    cpuTempC = readCpuTempFromCli();
  }

  let rxBytesPerSec = 0;
  let txBytesPerSec = 0;
  let iface = defaultIface || "";
  if (defaultIface) {
    const stats = await si.networkStats(defaultIface);
    const row = Array.isArray(stats) ? stats[0] : stats;
    if (row) {
      rxBytesPerSec = row.rx_sec ?? 0;
      txBytesPerSec = row.tx_sec ?? 0;
    }
  }

  const total = mem.total || 1;
  const used = mem.used ?? total - (mem.free ?? 0);
  const externalIp = getExternalIpCached();

  return {
    cpu: { cores },
    cpuTempC,
    memory: {
      total,
      used,
      free: mem.free ?? 0,
      percent: (used / total) * 100,
    },
    network: {
      interface: iface,
      rxBytesPerSec,
      txBytesPerSec,
    },
    externalIp,
    battery: process.platform === "darwin" ? readBatteryMac() : null,
  };
}
