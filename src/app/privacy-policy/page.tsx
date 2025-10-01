'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Privacy Policy</h1>
          <p className="text-lg" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8" style={{backgroundColor: '#DDBEA8'}}>
          
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>1. Introduction</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              HomeLens ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our property analysis service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>2.1 Personal Information</h3>
                <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  When you use HomeLens, we may collect personal information such as your email address, name, and property preferences. This information is used to provide you with personalised property analysis and recommendations.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>2.2 Property Data</h3>
                <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  We collect property URLs you provide for analysis, along with your preferences for property characteristics, location, and other criteria to generate personalised reports.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>2.3 Usage Data</h3>
                <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  We automatically collect information about how you interact with our service, including pages visited, time spent, and features used to improve our service.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>3. How We Use Your Information</h2>
            <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>To provide property analysis and personalised recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>To improve our service and develop new features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>To communicate with you about your account and our services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>To comply with legal obligations and protect our rights</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>4. Information Sharing</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:
            </p>
            <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>With service providers who assist us in operating our platform</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>When required by law or to protect our legal rights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>In connection with a business transfer or merger</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>5. Data Security</h2>
            <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>6. Your Rights</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              Under applicable data protection laws, you have the right to:
            </p>
            <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Access your personal information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Correct inaccurate information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Delete your personal information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Object to processing of your information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Data portability</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>7. Contact Us</h2>
            <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@homelens.co.uk
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
