import { motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";

export default function TermsOfServicePage() {
  const lastUpdated = "February 15, 2026";

  return (
    <>
      <Head>
        <title>Terms of Service — Devloops</title>
        <meta name="description" content="Devloops Terms of Service. Read our terms and conditions for using the Devloops platform." />
      </Head>

      <main className="min-h-screen px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h1 className="mb-4 text-4xl font-bold text-light-1000 dark:text-dark-1000 sm:text-5xl">
              Terms of <span className="gradient-text">Service</span>
            </h1>
            <p className="text-light-800 dark:text-dark-800">
              Last updated: {lastUpdated}
            </p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="space-y-8 rounded-2xl border border-light-200 bg-white p-8 shadow-lg dark:border-dark-300 dark:bg-dark-100 sm:p-12">
              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  1. Acceptance of Terms
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  By accessing, browsing, or using Devloops (&quot;the Service&quot;), operated by Devloops Ltd. (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you acknowledge that you have read, understood, and agree to be legally bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy, which is incorporated herein by reference. If you do not agree to all of these Terms, you are expressly prohibited from using the Service and must discontinue use immediately.
                </p>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  We reserve the right to modify, amend, or replace these Terms at any time at our sole discretion. Any changes will be effective immediately upon posting to the Service. It is your sole responsibility to review these Terms periodically. Your continued use of the Service following the posting of revised Terms constitutes your binding acceptance of such changes. If you do not agree to the updated Terms, you must stop using the Service.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  2. Eligibility
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  You must be at least 18 years of age or the age of legal majority in your jurisdiction (whichever is greater) to use the Service. By using the Service, you represent and warrant that you meet this eligibility requirement and have the legal capacity to enter into a binding agreement. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  3. Description of Service
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  Devloops provides AI-powered feedback analysis, ticket generation, and agent-ready prompt creation tools. Our Service allows teams to automatically analyze customer feedback, generate structured tickets, and create prompts for AI coding agents to execute on.
                </p>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  We reserve the right to modify, suspend, or discontinue any part of the Service (including features, pricing plans, or availability) at any time, with or without notice, and without liability to you. We do not guarantee that any specific feature or functionality will remain available. The Service is dependent on third-party providers (including AI model providers, hosting, and payment processors), and we are not responsible for any disruptions, changes, or limitations caused by such third parties.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  4. User Accounts
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  To access certain features of the Service, you must create an account. You are solely responsible for:
                </p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-light-800 dark:text-dark-800">
                  <li>Maintaining the confidentiality and security of your account credentials, including your password</li>
                  <li>All activities, actions, and charges that occur under your account, whether or not authorized by you</li>
                  <li>Providing accurate, current, and complete registration information and keeping it updated</li>
                  <li>Notifying us immediately at support@devloops.io of any unauthorized use or suspected breach of your account</li>
                </ul>
                <p className="mt-4 leading-relaxed text-light-800 dark:text-dark-800">
                  We shall not be liable for any loss or damage arising from your failure to comply with these obligations. We reserve the right to suspend or terminate any account at our sole discretion if we suspect fraudulent, abusive, or unauthorized activity.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  5. Acceptable Use
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  You agree not to use the Service to:
                </p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-light-800 dark:text-dark-800">
                  <li>Generate, distribute, or store content that is illegal, harmful, threatening, abusive, harassing, defamatory, obscene, or otherwise objectionable</li>
                  <li>Violate any applicable local, national, or international laws, regulations, or legal obligations</li>
                  <li>Infringe upon or misappropriate the intellectual property rights, privacy rights, or any other rights of third parties</li>
                  <li>Distribute spam, phishing materials, malware, viruses, or other harmful or deceptive content</li>
                  <li>Attempt to gain unauthorized access to our systems, networks, servers, or other users&apos; accounts</li>
                  <li>Interfere with, disrupt, or place an undue burden on the Service, its infrastructure, or connected networks</li>
                  <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code or underlying algorithms of the Service</li>
                  <li>Use the Service to build a competing product or service, or to benchmark the Service for competitive purposes</li>
                  <li>Resell, sublicense, or redistribute access to the Service without our prior written consent</li>
                  <li>Use automated scripts, bots, or scrapers to access the Service beyond the scope of normal use</li>
                </ul>
                <p className="mt-4 leading-relaxed text-light-800 dark:text-dark-800">
                  Violation of this section may result in immediate termination of your account without notice or refund, and we reserve the right to pursue any legal remedies available to us.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  6. Intellectual Property
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  <strong className="text-light-1000 dark:text-dark-1000">Your Content:</strong> You retain ownership of any original content you input into the Service. By using the Service, you grant us a worldwide, non-exclusive, royalty-free, sublicensable license to use, process, store, and display your content solely for the purpose of operating and providing the Service. You represent and warrant that you own or have the necessary rights and permissions for all content you submit to the Service.
                </p>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  <strong className="text-light-1000 dark:text-dark-1000">AI-Generated Output:</strong> Content generated by the Service using artificial intelligence is provided to you for your use subject to these Terms. Due to the nature of AI technology, similar or identical outputs may be generated for other users. We make no representations or warranties regarding the uniqueness, accuracy, or legal protectability of AI-generated content, and you are solely responsible for reviewing, verifying, and ensuring the legality of all output before use.
                </p>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  <strong className="text-light-1000 dark:text-dark-1000">Our Property:</strong> The Service, including but not limited to its software, design, user interface, graphics, logos, trademarks, algorithms, and all underlying technology, is the exclusive property of Devloops Ltd. and is protected by applicable intellectual property laws. You may not copy, modify, distribute, sell, lease, or create derivative works of any part of the Service without our express prior written consent.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  7. Payment, Billing, and Subscription
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  Certain features of the Service require a paid subscription. By subscribing to a paid plan, you agree to the following:
                </p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-light-800 dark:text-dark-800">
                  <li>You authorize us (or our third-party payment processor) to charge your selected payment method for all applicable fees on a recurring basis according to your chosen billing cycle</li>
                  <li>All fees are quoted and charged in the currency specified at checkout and are inclusive of applicable taxes unless otherwise stated</li>
                  <li>You are responsible for keeping your payment information current and accurate. Failure to maintain valid payment information may result in suspension or termination of your access</li>
                  <li>Subscriptions automatically renew at the end of each billing cycle unless you cancel before the renewal date</li>
                </ul>
                <p className="mt-4 leading-relaxed text-light-800 dark:text-dark-800">
                  We reserve the right to change our pricing, fees, or billing methods at any time. Any price changes will take effect at the start of your next billing cycle following notice of the change. Your continued use of the Service after a price change constitutes acceptance of the new pricing.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  8. Cancellation and Refund Policy
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  <strong className="text-light-1000 dark:text-dark-1000">Cancellation:</strong> You may cancel your subscription at any time through your account settings or by contacting us at support@devloops.io. Upon cancellation, your subscription will remain active until the end of your current paid billing period. After that, your account will be downgraded and you will lose access to paid features. Cancellation does not entitle you to any refund for the remaining period or any prior payments.
                </p>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  <strong className="text-light-1000 dark:text-dark-1000">No Refunds:</strong> All payments made to Devloops are final and non-refundable. By subscribing to the Service, you expressly acknowledge and agree that no refunds will be issued under any circumstances, including but not limited to: dissatisfaction with the Service, failure to use the Service, partial use of a billing period, downgrade of your plan, account termination (whether initiated by you or by us for cause), or changes to the Service&apos;s features or functionality.
                </p>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  <strong className="text-light-1000 dark:text-dark-1000">Exceptional Refunds:</strong> In rare and exceptional cases, Devloops may, at its sole and absolute discretion, choose to issue a refund. This is not a right or entitlement and no refund request is guaranteed to be approved. Any decision to grant an exceptional refund is final and does not create a precedent or obligation for future requests. If a refund is approved, the refund amount shall be calculated as the original payment amount minus a 15% service and processing fee, which accounts for administrative costs, payment processing fees, and resources already consumed.
                </p>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  <strong className="text-light-1000 dark:text-dark-1000">Chargebacks:</strong> If you initiate a chargeback or payment dispute with your bank or payment provider instead of contacting us directly, we reserve the right to immediately suspend or permanently terminate your account, pursue recovery of the disputed amount plus any fees or costs incurred, and take any legal action available to us. We encourage you to contact us first to resolve any billing concerns.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  9. Disclaimer of Warranties
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE EXPRESSLY DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, TITLE, AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.
                </p>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  Without limiting the foregoing, we make no warranty or representation that: (a) the Service will meet your requirements or expectations; (b) the Service will be uninterrupted, timely, secure, or error-free; (c) the results or content obtained through the Service will be accurate, reliable, complete, or current; (d) any errors or defects in the Service will be corrected; or (e) AI-generated content will be free from errors, inaccuracies, bias, or intellectual property infringement.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  10. Limitation of Liability
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DEVLOOPS LTD., ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, SUCCESSORS, OR ASSIGNS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, BUSINESS OPPORTUNITIES, GOODWILL, OR ANTICIPATED SAVINGS.
                </p>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE LESSER OF: (A) THE TOTAL AMOUNT YOU ACTUALLY PAID TO US IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (US $100).
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  11. Indemnification
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  You agree to indemnify, defend, and hold harmless Devloops Ltd., its officers, directors, employees, agents, affiliates, and licensors from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees and legal costs) arising out of or in connection with: (a) your use of or access to the Service; (b) your violation of these Terms; (c) your violation of any applicable law, regulation, or third-party right; (d) any content you submit, post, or transmit through the Service; or (e) any dispute between you and a third party related to the Service or content generated through it.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  12. Termination
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  We may suspend or terminate your access to the Service immediately, without prior notice or liability, for any reason at our sole discretion, including but not limited to a breach of these Terms, suspected fraudulent or abusive activity, non-payment, or upon request by law enforcement or government authorities.
                </p>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  Upon termination: (a) your right to access and use the Service will immediately cease; (b) we may permanently delete your account data, content, and associated information at our discretion; and (c) all provisions of these Terms which by their nature should survive termination shall survive, including but not limited to intellectual property provisions, disclaimers, limitations of liability, indemnification, and governing law provisions.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  13. Privacy and Data
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  Your use of the Service is also governed by our{" "}
                  <Link href="/privacy" className="text-brand-500 transition-colors hover:text-brand-600">
                    Privacy Policy
                  </Link>
                  . By using the Service, you consent to the collection, use, and processing of your information as described therein. We implement commercially reasonable security measures to protect your data, but we cannot guarantee absolute security and shall not be held liable for any unauthorized access, data breach, or data loss to the extent permitted by law.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  14. Third-Party Services
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  The Service may integrate with or contain links to third-party websites, services, or applications. We do not control, endorse, or assume any responsibility for the content, privacy policies, terms, or practices of any third-party services. Your interaction with any third-party service is governed solely by that third party&apos;s terms and policies, and is at your own risk.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  15. Force Majeure
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  Devloops shall not be liable for any failure or delay in performing its obligations under these Terms where such failure or delay results from events beyond our reasonable control, including but not limited to: acts of God, natural disasters, pandemic or epidemic, war, terrorism, civil unrest, government actions or regulations, power failures, internet or telecommunications failures, cyberattacks, third-party service outages, or any other force majeure event.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  16. Governing Law and Dispute Resolution
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  These Terms shall be governed by and construed exclusively in accordance with the laws of the State of Israel, without regard to its conflict of law provisions or the United Nations Convention on Contracts for the International Sale of Goods.
                </p>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  Any dispute, claim, or controversy arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts located in Tel Aviv-Jaffa, Israel. You irrevocably consent to the personal jurisdiction and venue of such courts and waive any objection based on inconvenient forum or lack of jurisdiction.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  17. Severability
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  If any provision of these Terms is found to be unlawful, void, or unenforceable by a court of competent jurisdiction, that provision shall be deemed severed from these Terms and shall not affect the validity and enforceability of the remaining provisions, which shall continue in full force and effect.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  18. Entire Agreement
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  These Terms, together with our Privacy Policy and any other legal notices or agreements published by us on the Service, constitute the entire agreement between you and Devloops Ltd. regarding your use of the Service and supersede all prior or contemporaneous communications, proposals, and agreements, whether oral or written.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  19. Contact Us
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  If you have any questions, concerns, or requests regarding these Terms of Service, please contact us at{" "}
                  <a
                    href="mailto:support@devloops.io"
                    className="text-brand-500 transition-colors hover:text-brand-600"
                  >
                    support@devloops.io
                  </a>
                  .
                </p>
              </section>
            </div>
          </motion.div>

          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 text-center"
          >
            <Link
              href="/"
              className="font-medium text-brand-500 transition-colors hover:text-brand-600"
            >
              &larr; Back to Home
            </Link>
          </motion.div>
        </div>
      </main>
    </>
  );
}
