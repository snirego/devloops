import { motion } from "framer-motion";
import Head from "next/head";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  const lastUpdated = "February 15, 2026";

  return (
    <>
      <Head>
        <title>Privacy Policy — Devloops</title>
        <meta name="description" content="Devloops Privacy Policy. Learn how we collect, use, and protect your data." />
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
              Privacy <span className="gradient-text">Policy</span>
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
                  1. Introduction
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  Devloops (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered feedback analysis and agent prompt generation service. Please read this policy carefully to understand our practices regarding your personal data.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  2. Information We Collect
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  We collect several types of information to provide and improve our Service:
                </p>

                <h3 className="mb-2 mt-6 text-xl font-medium text-light-1000 dark:text-dark-1000">
                  Personal Information
                </h3>
                <ul className="ml-4 list-inside list-disc space-y-2 text-light-800 dark:text-dark-800">
                  <li>Name and email address</li>
                  <li>Account credentials</li>
                  <li>Billing information and payment details</li>
                  <li>Profile information you choose to provide</li>
                </ul>

                <h3 className="mb-2 mt-6 text-xl font-medium text-light-1000 dark:text-dark-1000">
                  Usage Information
                </h3>
                <ul className="ml-4 list-inside list-disc space-y-2 text-light-800 dark:text-dark-800">
                  <li>Feedback data you submit to the Service</li>
                  <li>Workspace configurations and ticket data</li>
                  <li>Log data (IP address, browser type, pages visited)</li>
                  <li>Device information and identifiers</li>
                </ul>

                <h3 className="mb-2 mt-6 text-xl font-medium text-light-1000 dark:text-dark-1000">
                  Cookies and Tracking Technologies
                </h3>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  3. How We Use Your Information
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  We use the collected information for various purposes:
                </p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-light-800 dark:text-dark-800">
                  <li>To provide and maintain our Service</li>
                  <li>To process your transactions and manage your account</li>
                  <li>To improve and personalize your experience</li>
                  <li>To communicate with you about updates, support, and promotions</li>
                  <li>To detect, prevent, and address technical issues and security threats</li>
                  <li>To comply with legal obligations</li>
                  <li>To train and improve our AI models (with anonymized data only)</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  4. Data Sharing and Disclosure
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  We may share your information in the following circumstances:
                </p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-light-800 dark:text-dark-800">
                  <li><strong className="text-light-1000 dark:text-dark-1000">Service Providers:</strong> Third-party companies that help us operate our Service (hosting, payment processing, analytics)</li>
                  <li><strong className="text-light-1000 dark:text-dark-1000">Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                  <li><strong className="text-light-1000 dark:text-dark-1000">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  <li><strong className="text-light-1000 dark:text-dark-1000">With Your Consent:</strong> When you have given explicit permission</li>
                </ul>
                <p className="mt-4 leading-relaxed text-light-800 dark:text-dark-800">
                  We do not sell your personal information to third parties.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  5. Data Security
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security assessments. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  6. Data Retention
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. When you delete your account, we will delete or anonymize your personal data within a reasonable timeframe, except where we are required to retain it for legal purposes.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  7. Your Rights
                </h2>
                <p className="mb-4 leading-relaxed text-light-800 dark:text-dark-800">
                  Depending on your location, you may have the following rights regarding your personal data:
                </p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-light-800 dark:text-dark-800">
                  <li><strong className="text-light-1000 dark:text-dark-1000">Access:</strong> Request a copy of your personal data</li>
                  <li><strong className="text-light-1000 dark:text-dark-1000">Correction:</strong> Request correction of inaccurate data</li>
                  <li><strong className="text-light-1000 dark:text-dark-1000">Deletion:</strong> Request deletion of your personal data</li>
                  <li><strong className="text-light-1000 dark:text-dark-1000">Portability:</strong> Request transfer of your data to another service</li>
                  <li><strong className="text-light-1000 dark:text-dark-1000">Objection:</strong> Object to certain processing of your data</li>
                  <li><strong className="text-light-1000 dark:text-dark-1000">Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
                </ul>
                <p className="mt-4 leading-relaxed text-light-800 dark:text-dark-800">
                  To exercise these rights, please contact us at the email address provided below.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  8. Children&apos;s Privacy
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal data, please contact us, and we will take steps to delete such information.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  9. International Data Transfers
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We ensure appropriate safeguards are in place to protect your information in compliance with applicable laws.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  10. Changes to This Policy
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this Privacy Policy periodically for any changes.
                </p>
              </section>

              <section>
                <h2 className="mb-4 text-2xl font-semibold text-light-1000 dark:text-dark-1000">
                  11. Contact Us
                </h2>
                <p className="leading-relaxed text-light-800 dark:text-dark-800">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at{" "}
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
