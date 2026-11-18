import EventHubApp from '@/components/EventHubApp';
import { getBuildInfo } from '@/lib/buildInfo';

// Read APP_VERSION / APP_COLOR at request time (not build time),
// so Kubernetes can label Blue and Green deployments with env variables.
export const dynamic = 'force-dynamic';

export default function Home() {
  return <EventHubApp buildInfo={getBuildInfo()} />;
}
