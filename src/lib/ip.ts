import { BlockList, isIP } from "node:net";

/**
 * Cloudflare edge ranges (https://www.cloudflare.com/ips-v4 and /ips-v6).
 * Update this list when Cloudflare publishes changes (docs/YAYIN.md).
 */
export const CLOUDFLARE_IP_RANGES = {
  v4: [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ],
  v6: [
    "2400:cb00::/32",
    "2606:4700::/32",
    "2803:f800::/32",
    "2405:b500::/32",
    "2405:8100::/32",
    "2a06:98c0::/29",
    "2c0f:f248::/32",
  ],
} as const;

const cloudflareList = new BlockList();
for (const cidr of CLOUDFLARE_IP_RANGES.v4) {
  const [net, prefix] = cidr.split("/") as [string, string];
  cloudflareList.addSubnet(net, Number(prefix), "ipv4");
}
for (const cidr of CLOUDFLARE_IP_RANGES.v6) {
  const [net, prefix] = cidr.split("/") as [string, string];
  cloudflareList.addSubnet(net, Number(prefix), "ipv6");
}

/** Returns "ipv4" / "ipv6" plus the address with an IPv4-mapped IPv6 form (::ffff:1.2.3.4) unwrapped. */
function normalize(ip: string): { family: "ipv4" | "ipv6"; address: string } | null {
  let value = ip.trim();
  if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(value);
  if (mapped) value = mapped[1]!;
  const family = isIP(value);
  if (family === 4) return { family: "ipv4", address: value };
  if (family === 6) return { family: "ipv6", address: value };
  return null;
}

/** True when `ip` is inside one of Cloudflare's published ranges. Invalid input is false. */
export function isCloudflareIp(ip: string): boolean {
  const parsed = normalize(ip);
  return parsed ? cloudflareList.check(parsed.address, parsed.family) : false;
}
