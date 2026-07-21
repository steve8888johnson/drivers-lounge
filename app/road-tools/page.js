import PageShell from '../../components/PageShell';
import RoadIntelligenceDashboard from '../../components/RoadIntelligenceDashboard';
import ScaleReporter from '../../components/ScaleReporter';
export default function RoadTools(){return <PageShell eyebrow="ROAD INTELLIGENCE" title="Everything ahead, in one view" intro="Parking forecasts, route-adjusted fuel, weather, road events, truck stops, scales and services. Driver reports remain clearly separated from verified data feeds."><RoadIntelligenceDashboard/><section style={{marginTop:28}}><ScaleReporter/></section></PageShell>}
