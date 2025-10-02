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

      // Perform comprehensive analysis
      console.log('🔍 Starting comprehensive property analysis...');
      
      // Use direct listing text for testing (no scraper)
      let listingText = "No listing text available";
      let rightmoveData = null;
      
      if (rightmoveUrl) {
        // Use real property description from Rightmove listing
        listingText = `9 Manor Road, Cheadle Hulme, Cheadle, Cheshire, SK8
        
        Guide Price: £1,375,000
        
        Property Type: Detached
        Bedrooms: 5
        Bathrooms: 3
        Size: 3,265 sq ft (303 sq m)
        Tenure: Leasehold
        
        Key features:
        - Contemporary detached home
        - Prime Cheadle Hulme location
        - Open plan living/dining/kitchen
        - Fitted utility room
        - Private extensive enclosed gardens
        - Garage & Electric Gates
        - Extending to 3265 sq ft
        - Close to schools
        - EPC Rating = C
        
        Description:
        A contemporary five bedroom family home finished to an uncompromising standard all set within a generous plot and close to Cheadle Hulme centre and schools.
        
        Occupying a prime position on Manor Road, this outstanding 1950's contemporary detached residence extends to 3265 sq. ft, set in a generous plot and offers beautifully proportioned accommodation on a grand scale. Finished to a high specification throughout, the property has been lavishly designed through an extensive period of remodelling and refurbishment over more recent years to include premium finishes such as a COD kitchen, Roca bathroom suites, Bose sound system, Miele appliances, Howdens and Hammonds bespoke fitted furniture, double glazing and plantation shutters to the front to create an opulent and exceptional family home perfectly designed for modern day living and entertaining.
        
        This imposing property with an impressive façade is set back behind gates and is approached via an expansive cobbled driveway with parking for several vehicles and access to the garage with Hormann garage door. The front gardens are spacious and laid to grass with mature shrubbery borders, fencing and a high stone wall.
        
        The property is entered via an oversized black wooden door with attractive sidelights and opens into a generous reception hallway with stunning oak doors and Amtico herringbone flooring, which flows into the kitchen/living/dining room and gymnasium with carpet laid to the other reception rooms.
        
        To the immediate left, lies the spectacular double aspect living room which is beautifully presented with a feature bay window with plantation shutters with a delightful front aspect and living flame gas fire. To the right of the hallway lies an additional spacious reception room with bay window currently used a home gymnasium but could be used as a sitting room or family room. There is also another reception room to the rear of the property fitted as a home office but could suit a plethora of needs.
        
        The highlight of the ground floor accommodation is the living/dining kitchen spanning a notable 30'1" in total with enviable views over the manicured gardens beyond. The COD kitchen has been designed to an innovative finish with a range of bespoke kitchen handless units in two hues of matte grey with Quartz work tops. There is a comprehensive range of integrated Miele appliances including double ovens, coffee machine, induction hob, dishwasher, full height fridge/freezer, Liebherr wine cooler and Quooker tap. This stunning living space enjoys tremendous light levels from the striking glass roof light and bifold doors to the garden all of which create a wonderful area for entertaining with a central island perfect for informal dining. The open plan design allows for formal dining and living and indoor/outdoor dining and entertaining. Completing the ground floor accommodation is a fully fitted utility room with space for a washing machine and dryer, and WC.
        
        The first floor has been intelligently configured to provide five generously proportioned bedrooms and three contemporary bathroom suites off a bright and spacious gallery landing. The impressive 25' principal bedroom suite, benefits from a dressing room with Hammonds fitted wardrobes and an en suite with shower. Bedroom two also has a modern en suite with shower. The sizeable family bathroom has been beautifully designed with decorative wall tiling and flooring and a bath. The upstairs accommodation has plenty of storage with fitted wardrobes to all bedrooms. The loft is partially boarded with ladder access.
        
        Externally the rear gardens have been beautifully landscaped and the results are truly exceptional. A Millboard decking area and patio adjoins the rear elevation and provides ample of space for outdoor entertaining. The manicured lawned garden enjoys a high degree of privacy and is bordered by established hedging and mature trees.
        
        Location:
        9 Manor Road stands in desirable position on the border of Bramhall and Cheadle Hulme on this tree lined road in Bramhall Park Conservation area. Superbly placed for easy access to Cheadle Hulme station (Manchester Piccadilly 19 minutes) about 10 minute's walk away as is Waitrose and the village centre. Greenbank School, Cheadle Hulme School and Hulme Hall School are all less than 1 mile away. Bramhall Park is around the corner and Bramhall Lawn Tennis Club and Bramhall Park Golf Club are very close by. It is hardly surprising this leafy area has always remained in strong demand with so many amenities on hand.
        
        Square Footage: 3,265 sq ft
        Council Tax Band: F
        Parking: Yes
        Garden: Yes`;
        console.log('📝 Using real Rightmove property description');
      }
      
      const analysisResponse = await fetch('/api/comprehensive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          listingText,
          url: rightmoveUrl,
          toggles: userPrefs.features, // Pass selected binary features as toggles
          userPreferences: userPrefs.importance, // Pass importance directly
          anythingElse: userPrefs.anythingElse,
          rightmove: rightmoveData || { // Use scraped data or mock data
            firstSeen: "2024-01-01T00:00:00.000Z",
            nowUtc: new Date().toISOString()
          },
          ppdPostcodeSeries: [], // Placeholder for PPD data
          ppdPropertyTypeSeries: [], // Placeholder for PPD data
          ukFallbackSeries: [] // Placeholder for fallback data
        }),
      });

      console.log('Analysis Response status:', analysisResponse.status);
      const analysisData = await analysisResponse.json();
      
      if (!analysisData.success) {
        throw new Error(analysisData.error || 'Analysis failed');
      }

      console.log('✅ Comprehensive analysis completed successfully');
      console.log('📊 Analysis result:', analysisData.analysis);
      
      // Store the comprehensive analysis data
      localStorage.setItem('comprehensiveAnalysis', JSON.stringify(analysisData.analysis));
      localStorage.setItem('userPreferences', JSON.stringify(analysisData.analysis.userPreferences));
      
      console.log('💾 Comprehensive analysis data stored in localStorage');

      // Navigate to results page
      console.log('🚀 Navigating to results page...');
      router.push('/results');
      
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
