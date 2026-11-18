export interface BuildInfo {
  version: string;
  color: string;
  hostname: string;
}

// Values come from environment variables set in the Dockerfile / Kubernetes manifests.
export function getBuildInfo(): BuildInfo {
  return {
    version: process.env.APP_VERSION || 'dev',
    color: process.env.APP_COLOR || 'none',
    // In Kubernetes, HOSTNAME is the Pod name, which shows which Pod served the page.
    hostname: process.env.POD_NAME || process.env.HOSTNAME_OVERRIDE || 'local',
  };
}
