import SiteHeader from './SiteHeader';
export default function PageShell({eyebrow,title,intro,children}){return <><SiteHeader/><main><section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></section><section className="page-content">{children}</section></main></>}
