'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CookiePolicy() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F3DFC1'}}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Back link */}
        <button className="text-sm text-gray-600 hover:text-gray-800 mb-6 flex items-center gap-2" type="button" onClick={handleBack}>↩ Back to Home Page</button>

        {/* Header */}
        <div className="rounded-2xl shadow-sm border border-gray-100 p-8 mb-8" style={{backgroundColor: '#DDBEA8'}}>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Cookie Policy</h1>
          <p className="text-lg" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8" style={{backgroundColor: '#DDBEA8'}}>
          
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>1. What Are Cookies?</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and improving our service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>2. Types of Cookies We Use</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>2.1 Essential Cookies</h3>
                <p className="leading-relaxed mb-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas of the website.
                </p>
                <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
                  <p className="text-sm" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>
                    <strong>Examples:</strong> Session cookies, security cookies, user authentication cookies
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>2.2 Functional Cookies</h3>
                <p className="leading-relaxed mb-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  These cookies allow the website to remember choices you make and provide enhanced, more personal features.
                </p>
                <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
                  <p className="text-sm" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>
                    <strong>Examples:</strong> Language preferences, property search filters, user preferences
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>2.3 Analytics Cookies</h3>
                <p className="leading-relaxed mb-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                </p>
                <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
                  <p className="text-sm" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>
                    <strong>Examples:</strong> Google Analytics, page view tracking, user behavior analysis
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>3. Cookie Duration</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>3.1 Session Cookies</h3>
                <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  These cookies are temporary and are deleted when you close your browser. They help maintain your session while browsing our website.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>3.2 Persistent Cookies</h3>
                <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  These cookies remain on your device for a set period or until you delete them. They help us remember your preferences for future visits.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>4. Managing Your Cookie Preferences</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              You can control and manage cookies in several ways:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>4.1 Browser Settings</h3>
                <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  Most browsers allow you to refuse cookies or delete them. You can usually find these settings in the options or preferences menu of your browser.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>4.2 Our Cookie Banner</h3>
                <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  When you first visit our website, you'll see a cookie banner where you can choose which types of cookies to accept.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>5. Third-Party Cookies</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              Some cookies on our site are set by third-party services that we use to enhance your experience:
            </p>
            <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span><strong>Google Analytics:</strong> Helps us understand how you use our website</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span><strong>Fontshare:</strong> Provides web fonts for better typography</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span><strong>Vercel:</strong> Provides hosting and performance optimization</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>6. Impact of Disabling Cookies</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              If you choose to disable cookies, some features of our website may not function properly:
            </p>
            <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>You may need to re-enter your preferences each time you visit</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Some personalized features may not work correctly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>We may not be able to remember your property analysis history</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>7. Updates to This Policy</h2>
            <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>8. Contact Us</h2>
            <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              If you have any questions about our use of cookies, please contact us at cookies@homelens.co.uk
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
