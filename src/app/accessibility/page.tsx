'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function Accessibility() {
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Accessibility Statement</h1>
          <p className="text-lg" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8" style={{backgroundColor: '#DDBEA8'}}>
          
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Our Commitment</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              HomeLens is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards to make our website as inclusive as possible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Accessibility Standards</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 AA level. These guidelines help make web content more accessible to people with disabilities and user-friendly for everyone.
            </p>
            <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
              <p className="text-sm" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>
                <strong>WCAG 2.1 AA Guidelines:</strong> Perceivable, Operable, Understandable, and Robust content that works across different assistive technologies.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Accessibility Features</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Visual Accessibility</h3>
                <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>High contrast color schemes for better visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Scalable text that can be enlarged up to 200% without loss of functionality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Clear typography with good spacing and readability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Alternative text for images and visual elements</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Navigation & Interaction</h3>
                <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Keyboard navigation support for all interactive elements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Clear focus indicators for keyboard users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Logical tab order through all page elements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Skip links for efficient navigation</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Content & Structure</h3>
                <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Semantic HTML structure for screen readers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Clear headings hierarchy (H1, H2, H3, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Descriptive link text and button labels</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-lg">•</span>
                    <span>Form labels and instructions for all inputs</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Assistive Technology Support</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              Our website is designed to work with a variety of assistive technologies:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
                <h4 className="font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Screen Readers</h4>
                <p className="text-sm" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  Compatible with NVDA, JAWS, VoiceOver, and other screen reading software
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
                <h4 className="font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Voice Control</h4>
                <p className="text-sm" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  Works with voice control software like Dragon NaturallySpeaking
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
                <h4 className="font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Magnification</h4>
                <p className="text-sm" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  Compatible with browser zoom and screen magnification tools
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
                <h4 className="font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Switch Navigation</h4>
                <p className="text-sm" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                  Supports switch control and other alternative input methods
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Browser Compatibility</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              Our website is tested and optimized for accessibility across major browsers:
            </p>
            <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Google Chrome (latest versions)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Mozilla Firefox (latest versions)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Microsoft Edge (latest versions)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Safari (latest versions)</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Known Limitations</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              While we strive to ensure accessibility, we acknowledge that some areas may have limitations:
            </p>
            <ul className="space-y-2" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Third-party content or widgets may not be fully accessible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Some interactive elements may require mouse interaction for optimal experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>Older browser versions may have limited accessibility support</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Feedback & Support</h2>
            <p className="leading-relaxed mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              We welcome your feedback on the accessibility of HomeLens. If you encounter any accessibility barriers or have suggestions for improvement, please contact us:
            </p>
            <div className="p-4 rounded-lg" style={{backgroundColor: '#F3DFC1'}}>
              <h4 className="font-semibold mb-2" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Email</h4>
              <p className="text-sm" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                accessibility@homelens.co.uk
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Ongoing Improvements</h2>
            <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
              We are committed to continuous improvement of our accessibility features. This includes regular accessibility audits, user testing with people with disabilities, and implementing the latest accessibility best practices. We review and update this accessibility statement regularly to reflect our current accessibility status and improvements.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
