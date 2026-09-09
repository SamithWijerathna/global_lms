import dns, { Resolver } from "dns/promises";

export interface DomainDnsCheckResult {
  verified: boolean;
  cnameMatched: boolean;
  txtMatched: boolean;
  currentCnames: string[];
  currentTxts: string[];
  message: string;
}

export async function checkCustomDomainDns(
  domain: string,
  expectedCnameTarget: string,
  expectedToken: string
): Promise<DomainDnsCheckResult> {
  const cleanDomain = domain.trim().toLowerCase();
  const cleanTarget = expectedCnameTarget.trim().toLowerCase().replace(/\.$/, "");
  
  let currentCnames: string[] = [];
  let currentTxts: string[] = [];
  let cnameMatched = false;
  let txtMatched = false;

  // Use public DNS resolvers first (Google & Cloudflare) to bypass local OS/ISP DNS lookup issues
  const publicResolver = new Resolver();
  publicResolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]);

  const resolveCname = async (host: string): Promise<string[]> => {
    try {
      return await publicResolver.resolveCname(host);
    } catch (_) {
      try {
        return await dns.resolveCname(host);
      } catch (_) {
        return [];
      }
    }
  };

  const resolveTxt = async (host: string): Promise<string[][]> => {
    try {
      return await publicResolver.resolveTxt(host);
    } catch (_) {
      try {
        return await dns.resolveTxt(host);
      } catch (_) {
        return [];
      }
    }
  };

  const resolveIps = async (host: string): Promise<string[]> => {
    try {
      return await publicResolver.resolve4(host);
    } catch (_) {
      try {
        return await dns.resolve4(host);
      } catch (_) {
        return [];
      }
    }
  };

  // 1. Check CNAME record
  try {
    const cnameRecords = await resolveCname(cleanDomain);
    currentCnames = cnameRecords.map((c) => c.toLowerCase().replace(/\.$/, ""));
    cnameMatched = currentCnames.some(
      (c) => c === cleanTarget || c.endsWith(`.${cleanTarget}`)
    );
  } catch (err: any) {
    // No direct CNAME found
  }

  // 1b. Fallback: If CNAME flattening or A-record pointing is used, check IP resolution match
  if (!cnameMatched && cleanTarget) {
    try {
      const [targetIps, domainIps] = await Promise.all([
        resolveIps(cleanTarget),
        resolveIps(cleanDomain),
      ]);
      if (targetIps.length > 0 && domainIps.length > 0) {
        const ipMatched = domainIps.some((ip) => targetIps.includes(ip));
        if (ipMatched) {
          cnameMatched = true;
          currentCnames.push(`A-RECORD:${domainIps.join(",")}`);
        }
      }
    } catch (_) {}
  }

  // 2. Check TXT record verification (supports globallms-verification= and volit-verification=)
  const validPrefixes = [
    `globallms-verification=${expectedToken}`,
    `volit-verification=${expectedToken}`,
  ];
  try {
    const txtRecords = await resolveTxt(cleanDomain);
    currentTxts = txtRecords.flat();
    txtMatched = currentTxts.some(
      (txt) =>
        txt === expectedToken ||
        validPrefixes.includes(txt) ||
        (expectedToken && txt.includes(expectedToken))
    );
  } catch (err: any) {
    // No TXT record found
  }

  // Fallback: check TXT record on challenge subdomains (_globallms-challenge and _volit-challenge)
  if (!txtMatched && expectedToken) {
    for (const prefix of ["_globallms-challenge", "_volit-challenge"]) {
      try {
        const challengeDomain = `${prefix}.${cleanDomain}`;
        const challengeTxts = (await resolveTxt(challengeDomain)).flat();
        currentTxts.push(...challengeTxts);
        if (
          challengeTxts.some(
            (txt) =>
              txt === expectedToken ||
              validPrefixes.includes(txt) ||
              txt.includes(expectedToken)
          )
        ) {
          txtMatched = true;
          break;
        }
      } catch (_) {}
    }
  }

  const verified = cnameMatched || txtMatched;
  let message = "Domain verification successful.";
  if (!verified) {
    message = `DNS record not found. Please ensure your DNS has a CNAME record pointing to '${cleanTarget}' or a TXT record with 'globallms-verification=${expectedToken}'.`;
  }

  return {
    verified,
    cnameMatched,
    txtMatched,
    currentCnames,
    currentTxts,
    message,
  };
}
