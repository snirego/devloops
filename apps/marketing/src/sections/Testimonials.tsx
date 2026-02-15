import Image from "next/image";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

import SectionWrapper from "~/components/SectionWrapper";
import Badge from "~/components/Badge";

interface Testimonial {
  name: string;
  handle: string;
  image?: string;
  colour?: string;
  text: string;
  link?: string;
  featured?: boolean;
}

const testimonials: Testimonial[] = [
  {
    name: "Bobby Computers",
    handle: "@bobbycomputers",
    image: "/testimonials/avatars/bobby_computers.jpg",
    text: "Holy crap I love this app. It's brutally minimal but somehow has everything I need. The AI analysis alone saved us hours every week.",
    link: "https://x.com/bobbycomputers",
  },
  {
    name: "JR Raphael",
    handle: "@JRRaphael",
    image: "/testimonials/avatars/jrraphael.png",
    text: "The interesting thing about signing into Devloops for the first time is that it feels new and electrifying, and yet simultaneously quite familiar. The way it turns messy customer feedback into structured, agent-ready work items is staggering.",
    link: "https://www.fastcompany.com/91376028/trello-alternative-kan",
    featured: true,
  },
  {
    name: "singiamtel",
    handle: "@singiamtel",
    colour: "#ff6600",
    text: "We replaced our entire analysis process with Devloops. What took our PM 2 hours a day now just... happens.",
    link: "https://news.ycombinator.com/item?id=44157177",
  },
  {
    name: "Jan Stgmnn",
    handle: "@JanStgmnn",
    image: "/testimonials/avatars/jan_stgmnn.jpg",
    text: "Just wanted to say, that I really love the project. Feedback comes in, tickets go out, agents run on them. It's like having an extra PM and dev on the team.",
    link: "https://x.com/JanStgmnn",
  },
  {
    name: "Fox",
    handle: "@dscfox",
    image: "/testimonials/avatars/fox.png",
    text: "I've been looking at tools for months, but everything came up short. Devloops is the first platform that actually closes the loop from customer feedback to shipped code. Our velocity doubled in the first month.",
    link: "https://discord.gg/ZxjnjfqYSZ",
    featured: true,
  },
  {
    name: "Hanno Braun",
    handle: "@hannobraun",
    image: "/testimonials/avatars/hanno_braun.webp",
    text: "The AI-generated prompts are shockingly good. They include context, acceptance criteria, everything the agent needs. No more writing specs by hand.",
    link: "https://discord.gg/ZxjnjfqYSZ",
  },
  {
    name: "headlessdev_",
    handle: "@headlessdev_",
    image: "/testimonials/avatars/headless_dev.png",
    text: "This is the best thing I've seen here in a long time. Finally something that actually makes startups faster, not just another project board.",
    link: "https://www.reddit.com/r/selfhosted/comments/1l1f2st",
  },
  {
    name: "EHB",
    handle: "@ehb3839",
    image: "/testimonials/avatars/ehb.webp",
    text: "The simplicity of the overall app is a pleasure to use. Customer feedback goes in, agent-ready tickets come out. Magic.",
    link: "https://www.reddit.com/r/selfhosted/comments/1l1f2st",
  },
  {
    name: "BRAVO68WEB",
    handle: "@bravo68web",
    image: "/testimonials/avatars/bravo68web.jpeg",
    text: "I have fallen in love with the product. Our team ships faster now than we ever thought possible.",
    link: "https://discord.gg/ZxjnjfqYSZ",
  },
];

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  const initials = testimonial.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className={twMerge(
        "group break-inside-avoid rounded-2xl border border-light-200 bg-white/80 p-5 backdrop-blur-sm transition-all duration-200 hover:shadow-md dark:border-dark-300 dark:bg-dark-100/80",
        testimonial.featured && "border-brand-200 dark:border-brand-500/20"
      )}
    >
      <div className="flex items-center gap-3">
        {testimonial.image ? (
          <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full">
            <Image
              src={testimonial.image}
              alt={testimonial.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: testimonial.colour ?? "#6366f1" }}
          >
            {initials}
          </div>
        )}
        <p className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
          {testimonial.name}
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-light-900 dark:text-dark-900">
        &ldquo;{testimonial.text}&rdquo;
      </p>
    </motion.div>
  );
}

export default function Testimonials() {
  return (
    <SectionWrapper className="py-20 sm:py-28" id="testimonials">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <Badge>Testimonials</Badge>
          <h2 className="mt-4 text-3xl font-bold text-light-1000 dark:text-dark-1000 sm:text-4xl">
            Teams are shipping faster{" "}
            <span className="gradient-text">with Devloops</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-light-900 dark:text-dark-900">
            Startups and product teams use Devloops to eliminate busywork and focus on what matters.
          </p>
        </div>

        <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {testimonials.map((testimonial, idx) => (
            <div key={testimonial.handle} className="mb-4 break-inside-avoid">
              <TestimonialCard testimonial={testimonial} index={idx} />
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
