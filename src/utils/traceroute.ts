import { spawn } from 'child_process';
import { promises as dns } from 'dns';

export interface TracerouteHop {
  hop: number;
  ip: string | null;
  timed_out: boolean;
}

export interface TracerouteResult {
  hops: TracerouteHop[];
  reachable: boolean;
}

function parseLine(line: string): TracerouteHop | null {
  const hopNumberMatch = line.match(/^\s*(\d+)\s+/);
  if (!hopNumberMatch) return null;

  const hopNum = parseInt(hopNumberMatch[1], 10);
  const rest = line.slice(hopNumberMatch[0].length).trim();

  if (rest.startsWith('*')) {
    return { hop: hopNum, ip: null, timed_out: true };
  }

  const ipMatch = rest.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (ipMatch) {
    return { hop: hopNum, ip: ipMatch[1], timed_out: false };
  }

  return { hop: hopNum, ip: null, timed_out: true };
}

async function resolveDestinationIps(domain: string): Promise<Set<string>> {
  try {
    const addresses = await dns.resolve4(domain);
    return new Set(addresses);
  } catch {
    return new Set();
  }
}

async function checkHttpReachable(domain: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}`, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
    return res.status > 0;
  } catch {
    try {
      const res = await fetch(`http://${domain}`, { method: 'HEAD', signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
      return res.status > 0;
    } catch {
      return false;
    }
  }
}

export async function runTraceroute(domain: string, maxHops: number = 20): Promise<TracerouteResult> {
  const [destinationIps, reachableByHttp] = await Promise.all([
    resolveDestinationIps(domain),
    checkHttpReachable(domain),
  ]);

  return new Promise((resolve, reject) => {
    const hops: TracerouteHop[] = [];
    let reachable = reachableByHttp;
    let killedByTimeout = false;
    let buffer = '';

    const child = spawn('traceroute', ['-n', '-m', String(maxHops), '-w', '3', '-q', '1', domain]);

    const processBuffer = () => {
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const hop = parseLine(line);
        if (!hop) continue;

        hops.push(hop);

        if (hop.ip && destinationIps.has(hop.ip)) {
          reachable = true;
          child.kill();
          return;
        }
      }
    };

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      processBuffer();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      processBuffer();
    });

    child.on('close', () => {
      // Process any remaining buffered output
      if (buffer.trim()) {
        const hop = parseLine(buffer);
        if (hop) hops.push(hop);
      }

      // If not already marked reachable by HTTP check or DNS match, infer from
      // traceroute natural exit (stopped before maxHops → destination responded).
      if (!reachable && !killedByTimeout && hops.length > 0 && hops.length < maxHops) {
        reachable = true;
      }

      resolve({ hops, reachable });
    });

    child.on('error', (err) => {
      if ((err as any).code === 'ENOENT') {
        reject(new Error('traceroute is not available or failed to execute'));
      } else {
        reject(err);
      }
    });

    // Global safety timeout
    setTimeout(() => {
      killedByTimeout = true;
      child.kill();
    }, (maxHops * 4 + 10) * 1000);
  });
}
