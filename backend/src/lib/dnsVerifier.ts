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

  // 1. Check CNAME record
  try {
    const cnameRecords = await resolveCname(cleanDomain);
    currentCnames = cnameRecords.map((c) => c.toLowerCase().replace(/\.$/, ""));
    cnameMatched = currentCnames.some(
      (c) => c === cleanTarget || c.endsWith(`.${cleanTarget}`)
    );
  } catch (err: any) {
    // No CNAME found or domain not resolved
  }

  // 2. Check TXT record verification (e.g. volit-verification=<token>)
  const expectedTxtPrefix = `volit-verification=${expectedToken}`;
  try {
    const txtRecords = await resolveTxt(cleanDomain);
    currentTxts = txtRecords.flat();
    txtMatched = currentTxts.some(
      (txt) => txt === expectedToken || txt === expectedTxtPrefix || txt.includes(expectedToken)
    );
  } catch (err: any) {
    // No TXT record found
  }

  // Fallback: check TXT record on subdomain _volit-challenge.<domain>
  if (!txtMatched && expectedToken) {
    try {
      const challengeDomain = `_volit-challenge.${cleanDomain}`;
      const challengeTxts = (await resolveTxt(challengeDomain)).flat();
      currentTxts.push(...challengeTxts);
      txtMatched = challengeTxts.some(
        (txt) => txt === expectedToken || txt === expectedTxtPrefix || txt.includes(expectedToken)
      );
    } catch (_) {}
  }

  const verified = cnameMatched || txtMatched;
  let message = "Domain verification successful.";
  if (!verified) {
    message = `DNS record not found. Please ensure your DNS has a CNAME record pointing to '${cleanTarget}' or a TXT record with '${expectedTxtPrefix}'.`;
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
