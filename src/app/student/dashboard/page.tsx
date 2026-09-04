import Link from "next/link";
import { PortalFooter, PortalHeader } from "@/components/app-shell";

const featureCards = [
  { title: "Documents & Manuals", description: "Collection of documents, forms and manuals for administration, students, faculty, and staff.", icon: "▰" },
  { title: "Students", description: "Stores and tracks all student information, including grades, accountabilities, and more.", icon: "♟" },
  { title: "Student Services", description: "Group of modules for student development, activities, and services.", icon: "✥" },
];

export default function StudentDashboard() {
  return (
    <div className="portal-home">
      <PortalHeader />

      <main className="portal-main">
        <p className="portal-welcome">Good afternoon, welcome to your control center!</p>
        <div className="portal-toolbar">
          <Link href="/student/dashboard" className="portal-breadcrumb"><span className="portal-home-icon" aria-hidden="true">⌂</span>Home</Link>
          <label className="portal-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search..." aria-label="Search" /></label>
        </div>

        <section className="portal-feature-grid" aria-label="Student portal services">
          {featureCards.map((card) => (
            <article className="portal-feature-card" key={card.title}>
              <span className="portal-feature-icon" aria-hidden="true">{card.icon}</span>
              <div><h2>{card.title}</h2><p>{card.description}</p></div>
            </article>
          ))}
          <Link href="/student/nu-docs" className="portal-feature-card portal-feature-link">
            <span className="portal-feature-icon" aria-hidden="true">▤</span>
            <span><h2>NU-Docs</h2><p>Request and track your school documents online.</p></span>
          </Link>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
