'use client';

import { useRouter } from 'next/navigation';
import { Calculator, TrendingUp, MapPin, Star, ArrowRight, CheckCircle, ChevronDown, ChevronUp, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    router.push('/preferences-redesign');
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F3DFC1'}}>
      {/* Header */}
      <header style={{backgroundColor: '#F3DFC1'}}>
        <div className="max-w-7xl mx-auto px-4 py-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3" style={{marginLeft: '0.5%'}}>
              <img src="/ChatGPT Image Sep 23, 2025 at 11_42_31 AM.png" alt="HomeLens" className="h-16 md:h-28" />
            </div>
            <nav className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
              <a href="#how-it-works" className="transition-colors font-medium hover:opacity-80" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>How it Works</a>
              <a href="#features" className="transition-colors font-medium hover:opacity-80" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>What's included</a>
              <a href="#faq" className="transition-colors font-medium hover:opacity-80" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>FAQs</a>
            </nav>
            <button 
              className="md:hidden p-2"
              onClick={toggleMobileMenu}
              style={{color: '#160F29'}}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          
          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
              <div className="flex flex-col space-y-4 pt-4">
                <a 
                  href="#how-it-works" 
                  className="transition-colors font-medium hover:opacity-80" 
                  style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How it Works
                </a>
                <a 
                  href="#features" 
                  className="transition-colors font-medium hover:opacity-80" 
                  style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  What's included
                </a>
                <a 
                  href="#faq" 
                  className="transition-colors font-medium hover:opacity-80" 
                  style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQs
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="py-20">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20" style={{backgroundColor: '#F3DFC1', width: '100%'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="text-left">
              <h1 className="text-5xl md:text-7xl mb-8 leading-tight tracking-tight" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif', fontWeight: 700}}>
                <span className="block">Find Your</span>
                <span className="block">Dream <span className="relative inline-block" style={{color: '#368F8B'}}>Home
                  <svg className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-[120%] h-1" viewBox="0 0 120 10" preserveAspectRatio="none">
                    <path d="M 0 5 Q 30 -1.5 60 5 T 120 5" stroke="#368F8B" strokeWidth="3" fill="none"/>
                  </svg>
                </span> 🏡</span>
              </h1>
              
              <p className="text-lg md:text-xl mb-8 md:mb-12 max-w-3xl leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                <span className="block">Skip the guesswork. Get</span>
                <span className="block">personalised insights based on your choices.</span>
              </p>
              
              <div className="flex justify-start">
              <button
                onClick={handleGetStarted}
                className="px-6 md:px-8 py-3 md:py-4 text-white rounded-xl transition-colors text-base md:text-lg font-medium hover:opacity-90"
                style={{backgroundColor: '#368F8B', fontFamily: 'Satoshi, sans-serif'}}
              >
                Get Started for Free
              </button>
              </div>
            </div>

            {/* Right Column - Property Images */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {/* Image 1 - House exterior */}
              <div className="rounded-2xl overflow-hidden" style={{aspectRatio: '4/3'}}>
                <img 
                  src="/Charming Cottage in Lush Countryside.png" 
                  alt="Charming cottage in lush countryside" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Image 2 - Data Analysis */}
              <div className="rounded-2xl overflow-hidden" style={{aspectRatio: '4/3'}}>
                <img 
                  src="/ChatGPT Image Sep 23, 2025 at 11_24_59 AM.png" 
                  alt="Property analysis data visualization" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Image 3 - Data Visualization */}
              <div className="rounded-2xl overflow-hidden" style={{aspectRatio: '4/3'}}>
                <img 
                  src="/Experian.png" 
                  alt="Experian data analysis" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Image 4 - Neighborhood */}
              <div className="rounded-2xl overflow-hidden" style={{backgroundColor: '#DDBEA8', aspectRatio: '4/3'}}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🏘️</div>
                    <div className="text-sm font-medium" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>Great Location</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it Works */}
        <section id="how-it-works" className="mb-16 md:mb-20 mt-16 md:mt-32" style={{backgroundColor: '#DDBEA8', paddingTop: '4rem', paddingBottom: '4rem'}}>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>How does it work?</h2>
            <p className="text-lg md:text-xl" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>Get started in three simple steps</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">📝</span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Share your preferences</h3>
              <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                Tell us everything that matters to you in your dream home
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🔍</span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Analyse any property</h3>
              <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                Enter the Rightmove URL for the home you are considering
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Make informed decisions</h3>
              <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                We make a report that shows how well a house fits what you want and if it is a good price compared to other houses
              </p>
            </div>
          </div>
        </section>

        {/* What's included in the report */}
        <section className="mb-16 md:mb-20 py-8 md:py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12 md:mb-20">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>What's included</h2>
            </div>
            
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-[120%] -top-10" style={{backgroundColor: '#368F8B'}}></div>
              
              <div className="space-y-16">
                {/* Step 1 - Text on right */}
                <div className="flex items-center relative">
                  <div className="flex-1 pr-12 text-right">
                    <h3 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Market Metrics</h3>
                    <p className="text-lg leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      We show you the real numbers. Is this home priced right? Are prices going up or down in this area? We compare it to similar homes sold recently.
                    </p>
                  </div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor: '#368F8B'}}>
                      <span className="text-white text-2xl font-bold">01</span>
                    </div>
                  </div>
                  <div className="flex-1 pl-12"></div>
                </div>
                
                {/* Step 2 - Text on left */}
                <div className="flex items-center relative">
                  <div className="flex-1 pr-12"></div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor: '#368F8B'}}>
                      <span className="text-white text-2xl font-bold">02</span>
                    </div>
                  </div>
                  <div className="flex-1 pl-12">
                    <h3 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Custom Criteria</h3>
                    <p className="text-lg leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      We score how well this home fits your needs. Does it have what you want most? We check every detail that matters to you.
                    </p>
                  </div>
                </div>
                
                {/* Step 3 - Text on right */}
                <div className="flex items-center relative">
                  <div className="flex-1 pr-12 text-right">
                    <h3 className="text-2xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Personalised Recommendations</h3>
                    <p className="text-lg leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      We give you a clear answer. Book a viewing, make an offer, or keep looking? No more guessing what to do next.
                    </p>
                  </div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor: '#368F8B'}}>
                      <span className="text-white text-2xl font-bold">03</span>
                    </div>
                  </div>
                  <div className="flex-1 pl-12"></div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Comparison Table */}
        <section className="mb-20" style={{backgroundColor: '#160F29', paddingTop: '6.5rem', paddingBottom: '6.5rem'}}>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>In Minutes, Not Months</h2>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="overflow-hidden" style={{backgroundColor: 'transparent'}}>
              <div className="grid grid-cols-4 gap-0">
                {/* Header Row */}
                <div className="p-6 border-b" style={{backgroundColor: '#160F29', borderColor: '#368F8B'}}>
                  <h3 className="text-lg font-semibold text-white" style={{fontFamily: 'Satoshi, sans-serif'}}></h3>
                </div>
                <div className="p-6 border-b border-l" style={{backgroundColor: '#246A73', borderColor: '#368F8B'}}>
                  <h3 className="text-lg font-semibold text-white" style={{fontFamily: 'Satoshi, sans-serif'}}>HomeLens</h3>
                </div>
                <div className="p-6 border-b border-l" style={{backgroundColor: '#246A73', borderColor: '#368F8B'}}>
                  <h3 className="text-lg font-semibold text-white" style={{fontFamily: 'Satoshi, sans-serif'}}>Alone</h3>
                </div>
                <div className="p-6 border-b border-l" style={{backgroundColor: '#246A73', borderColor: '#368F8B'}}>
                  <h3 className="text-lg font-semibold text-white" style={{fontFamily: 'Satoshi, sans-serif'}}>Traditional Property Report</h3>
                </div>

                {/* Personalisation Row */}
                <div className="p-6 border-b" style={{backgroundColor: '#160F29', borderColor: '#368F8B'}}>
                  <h4 className="text-white font-medium text-base" style={{fontFamily: 'Satoshi, sans-serif'}}>Personalisation</h4>
                </div>
                <div className="p-6 border-b border-l" style={{backgroundColor: '#160F29', borderColor: '#368F8B'}}>
                  <p className="flex items-center gap-2 text-base" style={{color: '#22c55e'}}>
                    <CheckCircle className="w-4 h-4" style={{color: '#22c55e'}} />
                    Personalised to your exact preferences
                  </p>
                </div>
                <div className="p-6 border-b border-l" style={{backgroundColor: '#160F29', borderColor: '#368F8B'}}>
                  <p className="flex items-center gap-2 text-base" style={{color: '#22c55e'}}>
                    <CheckCircle className="w-4 h-4" style={{color: '#22c55e'}} />
                    Highly Personalised
                  </p>
                </div>
                <div className="p-6 border-b border-l" style={{backgroundColor: '#160F29', borderColor: '#368F8B'}}>
                  <p className="flex items-center gap-2 text-base" style={{color: '#ef4444'}}>
                    <span style={{color: '#ef4444'}}>✗</span>
                    Does not take into account personal preferences
                  </p>
                </div>

                {/* Value Consideration Row */}
                <div className="p-6 border-b border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <h4 className="text-white font-medium text-base" style={{fontFamily: 'Satoshi, sans-serif'}}>Value Consideration</h4>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="flex items-center gap-2 text-base" style={{color: '#22c55e'}}>
                    <CheckCircle className="w-4 h-4" style={{color: '#22c55e', width: '16px', height: '16px'}} />
                    Provides objective, real time analysis to ensure you get the best price
                  </p>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="text-red-400 flex items-center gap-2 text-base">
                    <span className="text-red-400">✗</span>
                    Can often overpay, not knowing the right price for the property
                  </p>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="text-red-400 flex items-center gap-2 text-base">
                    <span className="text-red-400">✗</span>
                    Uses legacy data that has a 3-6 month lag
                  </p>
                </div>

                {/* Speed Row */}
                <div className="p-6 border-b border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <h4 className="text-white font-medium text-base" style={{fontFamily: 'Satoshi, sans-serif'}}>Speed</h4>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="flex items-center gap-2 text-base" style={{color: '#22c55e'}}>
                    <CheckCircle className="w-4 h-4" style={{color: '#22c55e'}} />
                    Fast
                  </p>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="text-red-400 flex items-center gap-2 text-base">
                    <span className="text-red-400">✗</span>
                    Time consuming & overwhelming
                  </p>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="flex items-center gap-2 text-base" style={{color: '#22c55e'}}>
                    <CheckCircle className="w-4 h-4" style={{color: '#22c55e'}} />
                    Fast
                  </p>
                </div>

                {/* Price Row */}
                <div className="p-6 border-b border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <h4 className="text-white font-medium text-base" style={{fontFamily: 'Satoshi, sans-serif'}}>Price</h4>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="flex items-center gap-2 text-base" style={{color: '#22c55e'}}>
                    <CheckCircle className="w-4 h-4" style={{color: '#22c55e'}} />
                    Free
                  </p>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="flex items-center gap-2 text-base" style={{color: '#22c55e'}}>
                    <CheckCircle className="w-4 h-4" style={{color: '#22c55e'}} />
                    Free
                  </p>
                </div>
                <div className="p-6 border-b border-gray-700 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="text-red-400 flex items-center gap-2 text-base">
                    <span className="text-red-400">✗</span>
                    Expensive
                  </p>
                </div>

                {/* Ideal For Row */}
                <div className="p-6" style={{backgroundColor: '#160F29'}}>
                  <h4 className="text-white font-medium text-base" style={{fontFamily: 'Satoshi, sans-serif'}}>Ideal For</h4>
                </div>
                <div className="p-6 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="text-white text-base">
                    Busy professionals looking to get the best deal, without compromising their preferences or spending weeks researching
                  </p>
                </div>
                <div className="p-6 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="text-white text-base">
                    Time-rich buyers wanting to experience the 'home buying journey' and enjoy the research process
                  </p>
                </div>
                <div className="p-6 border-l border-gray-700" style={{backgroundColor: '#160F29'}}>
                  <p className="text-white text-base">
                    Property investors focused purely on area-level metrics rather than individual property assessment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* FAQ Section */}
        <section id="faq" className="mb-12 md:mb-18">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Frequently Asked Questions</h2>
            <p className="text-lg md:text-xl" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>Everything you need to know about HomeLens</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {/* FAQ Item 1 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(0)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>How does HomeLens work?</span>
                  {openFAQ === 0 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 0 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      Simply paste a Rightmove property link into our platform & tell us your personal preferences for your new home. We'll pull the data and analyse it against both the market (price per square metre, local growth rates etc) and your personal preferences. You then get a clear score for how closely that property matches your needs.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 2 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(1)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>What can I do with my score?</span>
                  {openFAQ === 1 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 1 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      The analysis is meant for a) comparison between different properties, b) to provide an insight into a property's value & c) as leverage for negotiation with the property seller
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 3 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(2)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>What data sources do you use?</span>
                  {openFAQ === 2 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 2 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      We use live data from Rightmove as well as historical data from the Land Registry. This means your analysis is always based on the most recent, accurate information available.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 4 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(3)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>How accurate are your property scores?</span>
                  {openFAQ === 3 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 3 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      Our Investment Score uses official government data and real market prices. The Personal Fit score uses AI to match property descriptions against your specific requirements. While no tool can predict the future, our data sources are the same ones used by professional property analysts.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 5 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(4)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>How much does HomeLens cost?</span>
                  {openFAQ === 4 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 4 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      It's completely free
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 6 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(5)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>What if the information is not publicly available?</span>
                  {openFAQ === 5 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 5 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      If any information is not publicly available then it will be explicitly mentioned within the report and that criteria will not be included within the analysis
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 7 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(6)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>How quickly do I get my report?</span>
                  {openFAQ === 6 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 6 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      Reports generate instantly. As soon as you paste a property link, our system pulls the data and creates your personalised analysis. No waiting days or weeks like traditional property reports.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 8 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(7)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Can I analyse any property on Rightmove?</span>
                  {openFAQ === 7 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 7 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      Yes, as long as it's an active Rightmove listing with sufficient data. Our system works with houses, flats, new builds, and period properties across England and Wales.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 9 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(8)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Is HomeLens a replacement for a survey or solicitor?</span>
                  {openFAQ === 8 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 8 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      No. HomeLens helps you decide which properties are worth pursuing before you spend money on surveys, legal fees, or even viewings. Think of us as your pre-purchase filter, not a replacement for professional property services.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 10 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(9)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Can I share reports with my partner or estate agent?</span>
                  {openFAQ === 9 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 9 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      Yes. Every report includes a shareable link so you can easily discuss findings with family, friends, or your estate agent.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ Item 11 */}
              <div className="rounded-xl overflow-hidden" style={{backgroundColor: '#DDBEA8', borderColor: '#DDBEA8'}}>
                <button
                  onClick={() => toggleFAQ(10)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between transition-colors hover:opacity-80"
                  style={{backgroundColor: '#DDBEA8'}}
                >
                  <span className="text-lg font-semibold" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>What if a property I analysed gets reduced in price?</span>
                  {openFAQ === 10 ? (
                    <ChevronUp className="w-5 h-5" style={{color: '#246A73'}} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{color: '#246A73'}} />
                  )}
                </button>
                {openFAQ === 10 && (
                  <div className="px-6 pb-4">
                    <p className="leading-relaxed" style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}>
                      Great question! Property prices change frequently. If you've analysed a property and the price drops, simply re-run the analysis with the updated link. Your Personal Fit score stays the same, but the Investment Score will update to reflect the new pricing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center p-8 md:p-20 mb-16 md:mb-20 mx-auto rounded-3xl" style={{backgroundColor: '#246A73', width: '94%'}}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6" style={{color: '#160F29', fontFamily: 'Satoshi, sans-serif'}}>Start your property analysis with HomeLens today!</h2>
          <p className="text-lg md:text-xl mb-8 md:mb-10 max-w-2xl mx-auto" style={{color: '#000000', fontFamily: 'Satoshi, sans-serif'}}>
            Get professional property analysis delivered at startup speed. Skip the manual research and make informed investment decisions.
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleGetStarted}
              className="px-6 md:px-8 py-3 md:py-4 text-white rounded-xl transition-colors text-base md:text-lg font-medium hover:opacity-90"
              style={{backgroundColor: '#368F8B', fontFamily: 'Satoshi, sans-serif'}}
            >
              Get Started
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{backgroundColor: '#DDBEA8'}}>
        <div className="max-w-7xl mx-auto px-4 py-8.4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/ChatGPT Image Sep 23, 2025 at 11_42_31 AM.png" alt="HomeLens" className="h-12 md:h-48" />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                <a 
                  href="/privacy-policy" 
                  className="text-sm transition-colors hover:opacity-80"
                  style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}
                >
                  Privacy Policy
        </a>
        <a
                  href="/cookie-policy" 
                  className="text-sm transition-colors hover:opacity-80"
                  style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}
                >
                  Cookie Policy
        </a>
        <a
                  href="/accessibility" 
                  className="text-sm transition-colors hover:opacity-80"
                  style={{color: '#246A73', fontFamily: 'Satoshi, sans-serif'}}
                >
                  Accessibility
                </a>
              </div>
              <div className="text-center" style={{color: '#246A73'}}>
                <p style={{fontFamily: 'Satoshi, sans-serif'}}>&copy; {new Date().getFullYear()} HomeLens. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}