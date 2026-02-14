const logos = [
  { name: "Sana", width: "w-20" },
  { name: "Fast Company", width: "w-28" },
  { name: "Couchbase", width: "w-24" },
  { name: "Lego", width: "w-14" },
  { name: "Airbus", width: "w-20" },
  { name: "Deloitte", width: "w-24" },
  { name: "Wakam", width: "w-20" },
  { name: "LinkedIn", width: "w-24" },
];

function LogoPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-8 items-center justify-center px-2">
      <span className="whitespace-nowrap text-sm font-semibold tracking-wide text-light-700 transition-colors duration-300 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-900">
        {name}
      </span>
    </div>
  );
}

export default function Logos() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-5">
        <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-light-700 dark:text-dark-700">
          Trusted by fast-moving teams around the world
        </p>

        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-light-100 to-transparent dark:from-dark-50" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-light-100 to-transparent dark:from-dark-50" />

          <div className="flex animate-marquee" style={{ width: "max-content" }}>
            <div className="flex flex-shrink-0 items-center gap-12 px-6">
              {logos.map((logo) => (
                <LogoPlaceholder key={`first-${logo.name}`} name={logo.name} />
              ))}
            </div>
            <div className="flex flex-shrink-0 items-center gap-12 px-6">
              {logos.map((logo) => (
                <LogoPlaceholder key={`second-${logo.name}`} name={logo.name} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
