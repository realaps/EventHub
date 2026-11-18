import { getBuildInfo } from '@/lib/buildInfo';

// Health endpoint used by Kubernetes readiness/liveness probes,
// the Jenkins verify stage and the Blue-Green switch check.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    status: 'ok',
    app: 'EventHub',
    ...getBuildInfo(),
    time: new Date().toISOString(),
  });
}
