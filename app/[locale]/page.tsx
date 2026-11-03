import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { AmbianceProvider } from "@/components/Ambiance";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Quiz from "@/components/Quiz";
import Catalogue from "@/components/Catalogue";
import Testimonials from "@/components/Testimonials";
import Stores from "@/components/Stores";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollTop from "@/components/ScrollTop";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <AmbianceProvider>
      <main>
        <Navbar />
        <Hero />
        <Quiz />
        <div className="seam" aria-hidden />
        <Catalogue />
        <div className="seam" aria-hidden />
        <Testimonials />
        <div className="seam" aria-hidden />
        <Stores />
        <div className="seam" aria-hidden />
        <ContactForm />
        <div className="seam" aria-hidden />
        <Footer />
        <ScrollTop />
      </main>
    </AmbianceProvider>
  );
}
