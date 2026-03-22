import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface TracerouteHop {
  hop: number;
  ip: string | null;
  timed_out: boolean;
}

export interface TracerouteResult {
  hops: TracerouteHop[];
  reachable: boolean;
}

function parseTracerouteOutput(output: string): TracerouteHop[] {
  const hops: TracerouteHop[] = [];

  for (const line of output.split('\n')) {
    const hopNumberMatch = line.match(/^\s*(\d+)\s+/);
    if (!hopNumberMatch) continue;

    const hopNum = parseInt(hopNumberMatch[1], 10);
    const rest = line.slice(hopNumberMatch[0].length).trim();

    if (rest.startsWith('*')) {
      hops.push({ hop: hopNum, ip: null, timed_out: true });
      continue;
    }

    const ipMatch = rest.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch) {
      hops.push({ hop: hopNum, ip: ipMatch[1], timed_out: false });
    } else {
      hops.push({ hop: hopNum, ip: null, timed_out: true });
    }
  }

  return hops;
}

export async function runTraceroute(domain: string, maxHops: number = 20): Promise<TracerouteResult> {
  let stdout = '';

  try {
    const result = await execFileAsync(
      'traceroute',
      ['-n', '-m', String(maxHops), '-w', '3', '-q', '1', domain],
      { timeout: (maxHops * 4 + 10) * 1000 }
    );
    stdout = result.stdout;
  } catch (err: any) {
    // execFile rejects on non-zero exit code; traceroute output is still in stdout
    if (err.stdout) {
      stdout = err.stdout;
    } else {
      throw new Error('traceroute is not available or failed to execute');
    }
  }

  const hops = parseTracerouteOutput(stdout);
  // If traceroute stopped before maxHops it means the destination responded — reachable.
  // Exact IP matching is unreliable because anycast/load balancing may cause the
  // destination to respond from a different IP than the one resolved at probe start.
  const reachable = hops.length > 0 && hops.length < maxHops;

  return { hops, reachable };
}
