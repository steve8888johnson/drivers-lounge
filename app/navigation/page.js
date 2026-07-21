import SiteHeader from '../../components/SiteHeader';
import NavigationPlanner from '../../components/NavigationPlanner';

export const metadata={title:'Truck Navigation | Drivers Lounge',description:'Truck-aware route planning with vehicle profiles, hazmat and oversize permit modes, scale status and live driver reports.'};

export default function Page(){return <><SiteHeader/><NavigationPlanner/></>}
