import Link from "next/link";
import { Breadcrumb, PortalFooter, PortalHeader } from "@/components/app-shell";

const documentFeatures = [
  { title: "Request Documents", description: "Submit a request for official university documents.", icon: "▤", href: "/student/request" },
  { title: "Track Request", description: "Check the current status of your submitted document requests.", icon: "◷", href: "/student/track" },
  { title: "Request History", description: "View your previous document requests and completed requests.", icon: "☷", href: "/student/history" },
];

export default function NuDocsPage() {
  return (
    <div className="portal-home">
      <PortalHeader />
      <main className="portal-main portal-landing-main">
        <Breadcrumb items={["NU-Docs"]} />
        <section className="nu-docs-intro"><span className="portal-kicker">Student services / Online requests</span><h1>NU-Docs</h1><p>Request, track, and manage your official university documents online.</p></section>
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