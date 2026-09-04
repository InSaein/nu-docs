import Link from "next/link";
import { PortalFooter, PortalHeader } from "@/components/app-shell";

const documentFeatures = [
  { title: "Request Documents", description: "Request your official school documents online.", icon: "▤", href: "/student/request" },
  { title: "Track Request", description: "Track the status of your submitted document requests.", icon: "◷", href: "/student/track" },
  { title: "Request History", description: "View your previous document requests and their status.", icon: "☷", href: "/student/history" },
  { title: "Notifications", description: "View updates and important notifications about your requests.", icon: "●", href: "/student/notifications" },
];

export default function NuDocsPage() {
  return (
    <div className="portal-home">
      <PortalHeader />
      <main className="portal-main portal-landing-main">
        <div className="portal-toolbar portal-landing-toolbar">
          <Link href="/student/dashboard" className="portal-breadcrumb"><span className="portal-doc-breadcrumb-icon" aria-hidden="true">▤</span>Home <span className="portal-chevron">&gt;</span> NU-Docs</Link>
        </div>
        <section className="portal-feature-grid portal-doc-grid" aria-label="NU-Docs services">
          {documentFeatures.map((feature) => (
            <Link href={feature.href} className="portal-feature-card portal-feature-link" key={feature.title}>
              <span className="portal-feature-icon" aria-hidden="true">{feature.icon}</span>
              <span><h2>{feature.title}</h2><p>{feature.description}</p></span>
            </Link>
          ))}
        </section>
      </main>
      <PortalFooter />
    </div>
  );
}