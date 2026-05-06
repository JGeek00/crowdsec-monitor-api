export interface PostCheckDomainResponse {
  domain: string;
  ips: PostCheckDomainResponse_IP[];
}

export interface PostCheckDomainResponse_IP {
  ip: string;
  blocklists: string[];
  allowlists: string[];
}
