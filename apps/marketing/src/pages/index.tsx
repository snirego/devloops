import Head from "next/head";

import Header from "~/sections/Header";
import Hero from "~/sections/Hero";
import ProblemStrip from "~/sections/ProblemStrip";
import ProductShowcase from "~/sections/ProductShowcase";
import OnTheGo from "~/sections/OnTheGo";
import Logos from "~/sections/Logos";
import Metrics from "~/sections/Metrics";
import Testimonials from "~/sections/Testimonials";
import Pricing from "~/sections/Pricing";
import Faq from "~/sections/Faq";
import FinalCta from "~/sections/FinalCta";
import Footer from "~/sections/Footer";

export default function Home() {
  return (
    <>
      <Head>
        <title>Devloops — AI agents that turn feedback into shipped code</title>
      </Head>
      <div className="min-h-screen bg-light-100 dark:bg-dark-50">
        <Header />
        <Hero />
        <Logos />
        <ProblemStrip />
        <ProductShowcase />
        <OnTheGo />
        <Metrics />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
        <Footer />
      </div>
    </>
  );
}
