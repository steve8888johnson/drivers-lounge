import PageShell from '../../components/PageShell';
import AuthPanel from '../../components/AuthPanel';
export const metadata={title:'Account | Drivers Lounge'};
export default function AccountPage(){return <PageShell eyebrow="FREE DRIVER ACCOUNT" title="Your Drivers Lounge account" intro="Create one secure account to keep your Driver Passport, equipment, documents and applications available across your phone, tablet and computer."><AuthPanel/></PageShell>}
