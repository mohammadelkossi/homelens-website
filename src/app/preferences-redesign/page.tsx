'use client';

import React, { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';

// Minimal, modern, light-theme redesign of your "What are you looking for?" screen
// Paste into your project as a component. Tailwind classes are used for styling.
// No external UI libs required.

function Chip({ selected, children, onClick }: { selected?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-full border text-sm transition
      ${selected ? "bg-black text-white border-black" : "text-gray-800 border-gray-200 hover:border-gray-300"}`}
      style={selected ? {} : {backgroundColor: '#F3DFC1'}}
      type="button"
    >
      {children}
    </button>
  );
}

function ToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<string>;
  value?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-800">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip key={opt} selected={value === opt} onClick={() => onChange(opt)}>
            {opt}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-gray-300 text-black focus:ring-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-gray-800">{label}</span>
    </label>
  );
}

function ImportanceSlider({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #160F29 0%, #160F29 ${(value - 1) * 11.11}%, #DDBEA8 ${(value - 1) * 11.11}%, #DDBEA8 100%)`
        }}
      />
    </div>
  );
}

function PropertyPreferencesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rightmoveUrl, setRightmoveUrl] = useState('');
  const [bedrooms, setBedrooms] = useState<string | undefined>(undefined);
  const [bathrooms, setBathrooms] = useState<string | undefined>(undefined);
  const [propertyType, setPropertyType] = useState<string | undefined>(undefined);

  const FEATURES = ["Garden", "Parking", "Garage", "New build"];
  const [features, setFeatures] = useState<Record<string, boolean>>(
    () => Object.fromEntries(FEATURES.map((f) => [f, false])) as Record<string, boolean>
  );


  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [postcode, setPostcode] = useState<string>("");
  const [preferredSpace, setPreferredSpace] = useState<string | undefined>(undefined);
  const [timeOnMarket, setTimeOnMarket] = useState<string | undefined>(undefined);
  const [anythingElse, setAnythingElse] = useState<string>("");
  
  // Importance sliders for each criteria
  const [bedroomsImportance, setBedroomsImportance] = useState<number>(5);
  const [bathroomsImportance, setBathroomsImportance] = useState<number>(5);
  const [propertyTypeImportance, setPropertyTypeImportance] = useState<number>(5);
  const [featuresImportance, setFeaturesImportance] = useState<Record<string, number>>(
    () => Object.fromEntries(FEATURES.map((f) => [f, 5])) as Record<string, number>
  );
  const [postcodeImportance, setPostcodeImportance] = useState<number>(5);
  const [spaceImportance, setSpaceImportance] = useState<number>(5);
  const [timeOnMarketImportance, setTimeOnMarketImportance] = useState<number>(5);
  const [anythingElseImportance, setAnythingElseImportance] = useState<number>(5);

  const progress = useMemo(() => {
    let total = 6; // bedrooms, bathrooms, type, any feature, preferred space, time on market
    let done = 0;
    if (bedrooms) done++;
    if (bathrooms) done++;
    if (propertyType) done++;
    if (Object.values(features).some(Boolean)) done++;
    if (preferredSpace) done++;
    if (timeOnMarket) done++;
    return Math.round((done / total) * 100);
  }, [bedrooms, bathrooms, propertyType, features, preferredSpace, timeOnMarket]);

  const handleSubmit = async () => {
    if (!rightmoveUrl.trim()) {
      setError('Please enter a Rightmove URL');
      return;
    }
    
    // Validate Rightmove URL format
    const rightmovePattern = /^https?:\/\/(www\.)?rightmove\.co\.uk\/properties\/\d+/i;
    if (!rightmovePattern.test(rightmoveUrl)) {
      setError('Please enter a valid Rightmove URL (e.g., https://www.rightmove.co.uk/properties/123456789)');
      return;
    }
    
    setIsAnalysing(true);
    setError(null);
    
    const payload = {
      bedrooms,
      bathrooms,
      propertyType,
      features: Object.keys(features).filter((k) => features[k]),
      preferredPostcode: postcode || undefined,
      preferredSpace,
      timeOnMarket,
      anythingElse: anythingElse.trim() || undefined,
      importance: {
        bedrooms: bedroomsImportance,
        bathrooms: bathroomsImportance,
        propertyType: propertyTypeImportance,
        features: featuresImportance,
        postcode: postcodeImportance,
        space: spaceImportance,
        timeOnMarket: timeOnMarketImportance,
        anythingElse: anythingElseImportance,
      },
    };

    try {
      // We'll update this with scraped data after we get the history
      let propertyData = {
        address: "123 Abbey Lane, Sheffield S10",
        price: 350000,
        bedrooms: 3,
        bathrooms: 2,
        propertyType: "Semi-Detached",
        size: 108,
        description: "A beautiful property in a great location with modern features."
      };

      const marketMetrics = {
        pricePerSqm: 3920,
        avgPricePerSqmPostcodeSold: 3800,
        avgPctPriceGrowthPerYear: 2.1,
        timeOnMarketDays: 21,
        roadSalesLastYear: 3,
        onMarketCountForConfig: 2
      };

      const userPrefs = {
        featuresImportance,
        postcodeImportance,
        bathroomsImportance,
        timeOnMarketImportance,
        preferredSpace,
        timeOnMarket,
        anythingElse: anythingElse.trim() || undefined
      };

      // Call the new combined analyze-property API
      console.log('🔄 v4.0 - Calling combined analyze-property API...');
      const analyzeResponse = await fetch('/api/analyze-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rightmoveUrl, preferences: userPrefs, anythingElse }),
      });

      console.log('Analyze Response status:', analyzeResponse.status);
      const analyzeData = await analyzeResponse.json();
      
      if (!analyzeData.success) {
        throw new Error(analyzeData.error || 'Failed to analyze property');
      }

      console.log('✅ Analysis Data:', analyzeData);

      // Update property data with AI-extracted information
      const enhancedPropertyData = analyzeData.propertyData;
      if (enhancedPropertyData) {
        // Update all property details with the AI-extracted data
        propertyData.address = enhancedPropertyData.address || propertyData.address;
        propertyData.price = enhancedPropertyData.currentPrice || propertyData.price;
        propertyData.bedrooms = enhancedPropertyData.bedrooms || propertyData.bedrooms;
        propertyData.bathrooms = enhancedPropertyData.bathrooms || propertyData.bathrooms;
        propertyData.propertyType = enhancedPropertyData.propertyType || propertyData.propertyType;
        propertyData.size = enhancedPropertyData.size || propertyData.size;
        
        // Add time on market data
        propertyData.dateListedIso = enhancedPropertyData.dateListed || enhancedPropertyData.dateListedIso;
        propertyData.daysOnMarket = enhancedPropertyData.daysOnMarket;
        
        console.log('🏠 Updated property data:', propertyData);
        console.log('📅 Time on market data added:', {
          dateListedIso: propertyData.dateListedIso,
          daysOnMarket: propertyData.daysOnMarket
        });
      }

      // Now call scoring API with the enhanced property data
      console.log('Calling scoring API with enhanced property data...');
      const scoreResponse = await fetch('/api/score-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          propertyData, 
          marketMetrics, 
          userPrefs, 
          propertyHistory: {
            currentPrice: enhancedPropertyData.currentPrice,
            saleHistory: enhancedPropertyData.saleHistory,
            avgAnnualGrowth: enhancedPropertyData.avgYearlyPriceGrowth ?? enhancedPropertyData.avgAnnualGrowth,
            yearsOfData: enhancedPropertyData.yearsOfData,
            hasHistory: enhancedPropertyData.saleHistory && enhancedPropertyData.saleHistory.length >= 2,
            analysis: enhancedPropertyData.analysis
          }
        }),
      });

      console.log('Score Response status:', scoreResponse.status);
      const scoreData = await scoreResponse.json();
      console.log('Score Data:', scoreData);
      
      // Store all results
      if (typeof window !== 'undefined') {
        localStorage.setItem('aiAnalysis', JSON.stringify(analyzeData.analysis));
        localStorage.setItem('scoreData', JSON.stringify(scoreData.scores));
        localStorage.setItem('scoreBreakdown', JSON.stringify(scoreData.breakdown));
        localStorage.setItem('propertyData', JSON.stringify(enhancedPropertyData));
        localStorage.setItem('propertyHistory', JSON.stringify({
          currentPrice: enhancedPropertyData.currentPrice,
          saleHistory: enhancedPropertyData.saleHistory,
          avgAnnualGrowth: enhancedPropertyData.avgYearlyPriceGrowth ?? enhancedPropertyData.avgAnnualGrowth,
          yearsOfData: enhancedPropertyData.yearsOfData,
          hasHistory: enhancedPropertyData.saleHistory && enhancedPropertyData.saleHistory.length >= 2,
          analysis: enhancedPropertyData.analysis
        }));
        
        // Store Land Registry data if available
        if (analyzeData.landRegistryData) {
          localStorage.setItem('landRegistryData', JSON.stringify(analyzeData.landRegistryData));
          console.log('🏛️ Land Registry data stored:', analyzeData.landRegistryData.success);
        }
        
        // Store yearly price changes if available
        if (analyzeData.yearlyPriceChanges) {
          localStorage.setItem('yearlyPriceChanges', JSON.stringify(analyzeData.yearlyPriceChanges));
          console.log('📊 Yearly price changes stored:', analyzeData.yearlyPriceChanges);
        }
        
      // Extract property features using OpenAI
      let extractedFeatures = {};
      let extractedPostcode = null;
      if (propertyData?.description) {
        try {
          const featuresResponse = await fetch('/api/extract-property-features', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              propertyDescription: propertyData.description,
              userFeatures: features
            })
          });
          
          if (featuresResponse.ok) {
            const result = await featuresResponse.json();
            extractedFeatures = result.features || {};
            extractedPostcode = result.postcode;
            console.log('🏠 Extracted property features:', extractedFeatures);
            console.log('📍 Extracted postcode:', extractedPostcode);
          }
        } catch (error) {
          console.error('Failed to extract property features:', error);
        }
      }

      // Analyze "Anything Else" for additional criteria
      let additionalCriteria = [];
      if (anythingElse && anythingElse.trim()) {
        try {
          const analyzeResponse = await fetch('/api/analyze-additional-criteria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anythingElse: anythingElse.trim() })
          });
          
          if (analyzeResponse.ok) {
            const result = await analyzeResponse.json();
            additionalCriteria = result.additionalCriteria || [];
            console.log('🔍 Additional criteria extracted:', additionalCriteria);
          }
        } catch (error) {
          console.error('Failed to analyze additional criteria:', error);
        }
      }

      // Store user preferences with additional criteria and extracted features
      const userPrefsWithAdditional = {
        ...userPrefs,
        additionalCriteria,
        extractedFeatures,
        extractedPostcode
      };
      
      localStorage.setItem('userPreferences', JSON.stringify(userPrefsWithAdditional));
      console.log('👤 User preferences stored:', userPrefsWithAdditional);
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      // Continue to results page even if analysis fails
    } finally {
      setIsAnalysing(false);
    }
    
    // Navigate to results page
    router.push('/results');
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen text-gray-900" style={{backgroundColor: '#368F8B'}}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Back link */}
        <button className="text-sm text-white hover:text-gray-200 mb-6 flex items-center gap-2" type="button" onClick={handleBack}>↩ Back to Home Page</button>

        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">What are you looking for in a property?</h1>
        <p className="text-gray-600 mb-6">Set your preferences and we'll tailor the analysis and recommendations.</p>


        {/* Rightmove URL Input */}
        <div className="rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-8" style={{backgroundColor: '#F3DFC1'}}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-medium">Property to Analyse</h2>
            <div className="group relative">
              <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center cursor-help text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-600">
                i
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                Paste the Rightmove URL of the property you want to analyse
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-700">Rightmove URL</label>
            <input
              type="text"
              value={rightmoveUrl}
              onChange={(e) => setRightmoveUrl(e.target.value)}
              placeholder="https://www.rightmove.co.uk/properties/..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-8" style={{backgroundColor: '#F3DFC1'}}>
          {/* Basics */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Basics</h2>
              <div className="group relative">
                <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center cursor-help text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-600">
                  i
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  Decide on how important these fundamentals are and weight them 1-10 on the right hand side
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div>
                  <ToggleGroup
                    label="Bedrooms"
                    options={["1", "2", "3", "4+"]}
                    value={bedrooms}
                    onChange={setBedrooms}
                  />
                </div>
                <div>
                  <ImportanceSlider value={bedroomsImportance} onChange={setBedroomsImportance} />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div>
                  <ToggleGroup
                    label="Bathrooms"
                    options={["1", "2", "3+"]}
                    value={bathrooms}
                    onChange={setBathrooms}
                  />
                </div>
                <div>
                  <ImportanceSlider value={bathroomsImportance} onChange={setBathroomsImportance} />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div>
                  <ToggleGroup
                    label="Property type"
                    options={["Detached", "Semi detached", "Terraced", "Flat"]}
                    value={propertyType}
                    onChange={setPropertyType}
                  />
                </div>
                <div>
                  <ImportanceSlider value={propertyTypeImportance} onChange={setPropertyTypeImportance} />
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Features</h2>
              <div className="group relative">
                <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center cursor-help text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-600">
                  i
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  Think about these features and how important they are to you
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {FEATURES.map((f) => (
                <div key={f} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                  <div>
                    <Checkbox label={f} checked={features[f]} onChange={(c) => setFeatures((prev) => ({ ...prev, [f]: c }))} />
                  </div>
                  <div>
                    <ImportanceSlider 
                      value={featuresImportance[f]} 
                      onChange={(val) => setFeaturesImportance((prev) => ({ ...prev, [f]: val }))} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>


          {/* Location */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Location</h2>
              <div className="group relative">
                <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center cursor-help text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-600">
                  i
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  Enter your ideal post code and how important location is to you
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Preferred postcode (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. M1, S10"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <ImportanceSlider value={postcodeImportance} onChange={setPostcodeImportance} />
              </div>
            </div>
          </section>

          {/* Preferred Space */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Preferred Space</h2>
              <div className="group relative">
                <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center cursor-help text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-600">
                  i
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  Choose your preferred amount of living space & its importance to you
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <ToggleGroup
                  label=""
                  options={["50-70 sqm", "71-90 sqm", "91-105 sqm", "105-120 sqm", "120-140 sqm", "140-170 sqm", "170 sqm plus"]}
                  value={preferredSpace}
                  onChange={setPreferredSpace}
                />
              </div>
              <div>
                <ImportanceSlider value={spaceImportance} onChange={setSpaceImportance} />
              </div>
            </div>
          </section>


          {/* Anything Else */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Anything Else</h2>
            <div className="space-y-2">
              <textarea
                value={anythingElse}
                onChange={(e) => setAnythingElse(e.target.value)}
                placeholder="Include anything else that you'd like to include within our analysis, preferably stating how important this preference is e.g. I need the house to be within 1km of a church and that to me is of 10/10 importance"
                className="w-full h-24 rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
              />
            </div>
          </section>

          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-red-800 font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-2">{error}</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-between gap-4 mt-6">
          <button
            className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100"
            style={{backgroundColor: '#F3DFC1'}}
            type="button"
            onClick={() => {
              setBedrooms(undefined);
              setBathrooms(undefined);
              setPropertyType(undefined);
              setFeatures(Object.fromEntries(Object.keys(features).map((k) => [k, false])) as Record<string, boolean>);
              setPostcode("");
              setPreferredSpace(undefined);
              setTimeOnMarket(undefined);
              setAnythingElse("");
              setBedroomsImportance(5);
              setBathroomsImportance(5);
              setPropertyTypeImportance(5);
              setFeaturesImportance(Object.fromEntries(FEATURES.map((f) => [f, 5])) as Record<string, number>);
              setPostcodeImportance(5);
              setSpaceImportance(5);
              setTimeOnMarketImportance(5);
              setAnythingElseImportance(5);
            }}
          >
            Reset
          </button>

          <button
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-black text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            onClick={handleSubmit}
            disabled={isAnalysing}
          >
            {isAnalysing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Analysing...
              </>
            ) : (
              '→ Analyse Property'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PropertyPreferencesRedesign() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PropertyPreferencesContent />
    </Suspense>
  );
}
