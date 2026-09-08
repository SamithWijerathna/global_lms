import dns from "dns/promises";

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

  // 1. Check CNAME record
  try {
    const cnameRecords = await dns.resolveCname(cleanDomain);
    currentCnames = cnameRecords.map((c) => c.toLowerCase().replace(/\.$/, ""));
    cnameMatched = currentCnames.includes(cleanTarget);
  } catch (err: any) {
    // No CNAME found or domain not resolved
  }

  // 2. Check TXT record verification (e.g. globallms-verification=<token>)
  const expectedTxtPrefix = `globallms-verification=${expectedToken}`;
  try {
    const txtRecords = await dns.resolveTxt(cleanDomain);
    currentTxts = txtRecords.flat();
    txtMatched = currentTxts.some(
      (txt) => txt === expectedToken || txt === expectedTxtPrefix || txt.includes(expectedToken)
    );
  } catch (err: any) {
    // No TXT record found
  }

  // Fallback: check TXT record on subdomain _globallms-challenge.<domain>
  if (!txtMatched) {
    try {
      const challengeDomain = `_globallms-challenge.${cleanDomain}`;
      const challengeTxts = (await dns.resolveTxt(challengeDomain)).flat();
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
