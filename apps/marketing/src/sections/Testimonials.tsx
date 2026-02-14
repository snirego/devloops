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
    text: "Holy crap I love this app. It's brutally minimal but somehow has everything I need.",
    link: "https://x.com/bobbycomputers",
  },
  {
    name: "JR Raphael",
    handle: "@JRRaphael",
    image: "/testimonials/avatars/jrraphael.png",
    text: "The interesting thing about signing into Kan for the first time is that it feels new and electrifying -- and yet simultaneously quite familiar. At its core, Kan gives you a super-minimalist and frills-free Trello-style Kanban board. And the extent to which it has been able to build upon the original Trello vision is staggering.",
    link: "https://www.fastcompany.com/91376028/trello-alternative-kan",
    featured: true,
  },
  {
    name: "singiamtel",
    handle: "@singiamtel",
    colour: "#ff6600",
    text: "The project seems nice, but how good is that domain name.",
    link: "https://news.ycombinator.com/item?id=44157177",
  },
  {
    name: "Jan Stgmnn",
    handle: "@JanStgmnn",
    image: "/testimonials/avatars/jan_stgmnn.jpg",
    text: "Just wanted to say, that I really love the project. It's so easy to use and has a really nice UI!",
    link: "https://x.com/JanStgmnn",
  },
  {
    name: "Fox",
    handle: "@dscfox",
    image: "/testimonials/avatars/fox.png",
    text: "I've been looking at alternatives for months, but everything came up short. Some were direct clones, but lacked features I was dependent on. Others were rich in features, but strayed too far away from the simplicity of Trello. This seems like the best alternative for me.",
    link: "https://discord.gg/e6ejRb6CmT",
    featured: true,
  },
  {
    name: "Hanno Braun",
    handle: "@hannobraun",
    image: "/testimonials/avatars/hanno_braun.webp",
    text: "I've been very impressed with the app so far! It's great to have such a nice open source alternative to Trello.",
    link: "https://discord.gg/e6ejRb6CmT",
  },
  {
    name: "headlessdev_",
    handle: "@headlessdev_",
    image: "/testimonials/avatars/headless_dev.png",
    text: "This is the best thing I've seen here in a long time.",
    link: "https://www.reddit.com/r/selfhosted/comments/1l1f2st/i_made_an_opensource_alternative_to_trello/",
  },
  {
    name: "EHB",
    handle: "@ehb3839",
    image: "/testimonials/avatars/ehb.webp",
    text: "It's exactly what I've been looking for recently. The simplicity of the overall app is a pleasure to use.",
    link: "https://www.reddit.com/r/selfhosted/comments/1l1f2st/i_made_an_opensource_alternative_to_trello/",
  },
  {
    name: "BRAVO68WEB",
    handle: "@bravo68web",
    image: "/testimonials/avatars/bravo68web.jpeg",
    text: "I have fallen in love with the project.",
    link: "https://discord.gg/e6ejRb6CmT",
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
        <div>
          <p className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
            {testimonial.name}
          </p>
          {testimonial.link ? (
            <a
              href={testimonial.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-900"
            >
              {testimonial.handle}
            </a>
          ) : (
            <p className="text-xs text-light-700 dark:text-dark-700">
              {testimonial.handle}
            </p>
          )}
        </div>
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
            Loved by teams worldwide
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-light-900 dark:text-dark-900">
            Teams and creators building real products trust Devloops every day.
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
