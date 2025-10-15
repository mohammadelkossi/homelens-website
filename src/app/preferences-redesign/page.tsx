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
      className={`px-3 py-2 rounded-full border text-sm transition cursor-pointer
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
  const [anythingElseEntries, setAnythingElseEntries] = useState<Array<{id: string, text: string, importance: number}>>([
    { id: '1', text: '', importance: 5 }
  ]);
  
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

  // Functions to handle multiple "Anything Else" entries
  const addAnythingElseEntry = () => {
    const newId = (anythingElseEntries.length + 1).toString();
    setAnythingElseEntries([...anythingElseEntries, { id: newId, text: '', importance: 5 }]);
  };

  const updateAnythingElseEntry = (id: string, text: string) => {
    setAnythingElseEntries(entries => 
      entries.map(entry => entry.id === id ? { ...entry, text } : entry)
    );
  };

  const updateAnythingElseImportance = (id: string, importance: number) => {
    setAnythingElseEntries(entries => 
      entries.map(entry => entry.id === id ? { ...entry, importance } : entry)
    );
  };

  const removeAnythingElseEntry = (id: string) => {
    if (anythingElseEntries.length > 1) {
      setAnythingElseEntries(entries => entries.filter(entry => entry.id !== id));
    }
  };

  const progress = useMemo(() => {
    let total = 7; // bedrooms, bathrooms, type, any feature, preferred space, time on market, anything else
    let done = 0;
    if (bedrooms) done++;
    if (bathrooms) done++;
    if (propertyType) done++;
    if (Object.values(features).some(Boolean)) done++;
    if (preferredSpace) done++;
    if (timeOnMarket) done++;
    if (anythingElseEntries.some(entry => entry.text.trim())) done++;
    return Math.round((done / total) * 100);
  }, [bedrooms, bathrooms, propertyType, features, preferredSpace, timeOnMarket, anythingElseEntries]);

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

    // Declare variables outside try block so they're accessible in catch
    let listingText = "No listing text available";
    let rightmoveData = null;
    let scrapeData = null;
    let propertyData = null;
    let marketMetrics = null;

    try {
      // No mock data - we'll use only real scraped data

      const userPrefs = {
        features: features, // Include the features object
        featuresImportance,
        postcodeImportance,
        bedroomsImportance,
        bathroomsImportance,
        propertyTypeImportance,
        spaceImportance,
        timeOnMarketImportance,
        anythingElseImportance,
        // Include actual preference values
        postcode: postcode || undefined,
        bedrooms: bedrooms || undefined,
        bathrooms: bathrooms || undefined,
        propertyType: propertyType || undefined,
        preferredSpace: preferredSpace || undefined,
        timeOnMarket: timeOnMarket || undefined,
        anythingElse: anythingElseEntries.filter(entry => entry.text.trim()).map(entry => entry.text.trim()).join('; ') || undefined,
        anythingElseEntries: anythingElseEntries.filter(entry => entry.text.trim())
      };

      console.log('🔍 User preferences being sent:', userPrefs);

      // Perform comprehensive analysis
      console.log('🔍 Starting comprehensive property analysis...');
      
      if (rightmoveUrl) {
        try {
          console.log('🕷️ Scraping Rightmove URL:', rightmoveUrl);
          
          // Use Apify-first workflow with OpenAI fallback for missing data
          console.log('🚀 Starting Apify-first scraping workflow...');
          
          const scrapeResponse = await fetch('/api/scrape-with-apify-fallback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rightmoveUrl }),
          });
          
          if (scrapeResponse.ok) {
            scrapeData = await scrapeResponse.json();
            console.log('🕷️ Scrape response:', scrapeData);
            
            if (scrapeData.success && scrapeData.propertyData) {
              // Extract listing text from the property data for comprehensive analysis
              listingText = scrapeData.listingText || scrapeData.propertyData.description || '';
              
              // If listingText is still empty or very short, create a comprehensive description
              if (!listingText || listingText.length < 50) {
                listingText = `Property: ${scrapeData.propertyData.address || 'Unknown address'}, ` +
                  `Price: £${scrapeData.propertyData.price || 'Unknown'}, ` +
                  `${scrapeData.propertyData.bedrooms || 'Unknown'} bedrooms, ` +
                  `${scrapeData.propertyData.bathrooms || 'Unknown'} bathrooms, ` +
                  `${scrapeData.propertyData.propertyType || 'Unknown type'}, ` +
                  `Size: ${scrapeData.propertyData.sizeInSqm || 'Unknown size'} sqm`;
              }
              
              rightmoveData = {
                address: scrapeData.propertyData.address,
                price: scrapeData.propertyData.price,
                bedrooms: scrapeData.propertyData.bedrooms,
                bathrooms: scrapeData.propertyData.bathrooms,
                propertyType: scrapeData.propertyData.propertyType,
                size: scrapeData.propertyData.sizeInSqm,
                sizeInSqm: scrapeData.propertyData.sizeInSqm,
                description: scrapeData.propertyData.description,
                features: scrapeData.propertyData.features,
                images: scrapeData.propertyData.images,
                coordinates: scrapeData.propertyData.coordinates,
                firstSeen: scrapeData.propertyData.firstVisibleDate || scrapeData.propertyData.listingUpdateDate,
                nowUtc: new Date().toISOString(),
                daysOnMarket: null,
                priceHistory: scrapeData.propertyData.priceHistory,
                epc: scrapeData.propertyData.epc,
                floorplans: scrapeData.propertyData.floorplans,
                tenure: scrapeData.propertyData.tenure,
                councilTaxBand: scrapeData.propertyData.councilTaxBand,
                agent: scrapeData.propertyData.agent
              };
              
              console.log('✅ Successfully scraped property data with Apify + OpenAI fallback');
              console.log('📊 Scraping method:', scrapeData.scrapingMethod);
              console.log('📊 Extraction methods:', scrapeData.extractionMethods);
              console.log('  - Size extraction:', scrapeData.extractionMethods?.size);
              console.log('  - Date extraction:', scrapeData.extractionMethods?.firstListedDate);
              console.log('📝 Property summary:');
              console.log('  - Address:', rightmoveData.address);
              console.log('  - Price: £' + rightmoveData.price?.toLocaleString());
              console.log('  - Size:', rightmoveData.sizeInSqm, 'sqm');
              console.log('  - Bedrooms:', rightmoveData.bedrooms);
              console.log('  - Bathrooms:', rightmoveData.bathrooms);
              console.log('  - First Listed:', rightmoveData.firstSeen);
              console.log('  - Features:', rightmoveData.features?.length || 0);
              console.log('📝 Listing text extracted:', listingText.substring(0, 100) + '...');
            } else {
              console.error('❌ Scraping failed:', scrapeData.error);
              listingText = "Failed to scrape property details";
            }
          } else {
            console.error('❌ Scrape request failed:', scrapeResponse.status);
            listingText = "Failed to scrape property details";
          }
        } catch (error) {
          console.error('❌ Failed to scrape Rightmove:', error);
          listingText = "Failed to scrape property details";
        }
      }
      
      // Ensure we have listing text for the comprehensive analysis
      if (!listingText || listingText.trim() === '') {
        console.log('⚠️ No listing text available, using property details as fallback');
        listingText = `Property: ${rightmoveData?.address || 'Unknown address'}, Price: £${rightmoveData?.price || 'Unknown'}, ${rightmoveData?.bedrooms || 'Unknown'} bedrooms, ${rightmoveData?.bathrooms || 'Unknown'} bathrooms, ${rightmoveData?.propertyType || 'Unknown type'}`;
      }
      
      console.log('📝 Final listing text for comprehensive analysis:', listingText.substring(0, 200) + '...');
      
      const analysisResponse = await fetch('/api/comprehensive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          listingText,
          url: rightmoveUrl,
          scrapedPropertyData: scrapeData?.propertyData ? {
            address: scrapeData.propertyData.address,
            price: scrapeData.propertyData.price,
            bedrooms: scrapeData.propertyData.bedrooms,
            bathrooms: scrapeData.propertyData.bathrooms,
            propertyType: scrapeData.propertyData.propertyType,
            size: scrapeData.propertyData.size,
            sizeInSqm: scrapeData.propertyData.size,
            description: scrapeData.propertyData.description,
            features: scrapeData.propertyData.features,
            images: scrapeData.propertyData.images,
            priceHistory: scrapeData.propertyData.priceHistory,
            coordinates: scrapeData.propertyData.coordinates,
            firstVisibleDate: scrapeData.propertyData.firstVisibleDate,
            listingUpdateDate: scrapeData.propertyData.listingUpdateDate
          } : null,
          toggles: {
            garage: userPrefs.features["Garage"] || false,
            garden: userPrefs.features["Garden"] || false,
            parking: userPrefs.features["Parking"] || false,
            newBuild: userPrefs.features["New build"] || false
          }, // Convert UI feature names to API format
          userPreferences: userPrefs, // Pass full user preferences object
          anythingElse: userPrefs.anythingElse,
          rightmove: rightmoveData ? {
            firstSeen: rightmoveData.firstSeen,
            nowUtc: rightmoveData.nowUtc
          } : null, // No fallback - use only real data
          ppdPostcodeSeries: null, // No placeholder data
          ppdPropertyTypeSeries: null, // No placeholder data
          ukFallbackSeries: null // No placeholder data
        }),
      });

      console.log('Analysis Response status:', analysisResponse.status);
      const analysisData = await analysisResponse.json();
      
      console.log('🔍 Analysis response data:', JSON.stringify(analysisData, null, 2));
      
      if (!analysisData.success) {
        console.error('❌ Analysis failed:', analysisData.error);
        throw new Error(analysisData.error || 'Analysis failed');
      }

      console.log('✅ Comprehensive analysis completed successfully');
      console.log('📊 Analysis result:', analysisData.analysis);
      
      // Store the comprehensive analysis data
      localStorage.setItem('comprehensiveAnalysis', JSON.stringify(analysisData));
      localStorage.setItem('userPreferences', JSON.stringify(userPrefs));
      localStorage.setItem('rightmoveUrl', rightmoveUrl); // Store the URL for time on market calculation
      
      console.log('💾 Comprehensive analysis data stored in localStorage');

      // Navigate to results page
      console.log('🚀 Navigating to results page...');
      router.push('/results');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      console.error('❌ Error details:', error.message || error);
      
      // Fallback: Store the scraped data directly if comprehensive analysis fails
      if (rightmoveData) {
        console.log('🔄 Using fallback: storing scraped data directly');
        
        const fallbackAnalysisData = {
          success: false,
          analysis: {
            basicInfo: {
              propertyAddress: rightmoveData?.address || 'Unknown',
              listingPrice: rightmoveData?.price || null,
              area: null,
              floorAreaSqm: rightmoveData?.sizeInSqm || null,
              numberOfBedrooms: rightmoveData?.bedrooms || null,
              numberOfBathrooms: rightmoveData?.bathrooms || null,
              propertyType: rightmoveData?.propertyType || null,
              description: rightmoveData?.description || '',
              listingUrl: rightmoveUrl
            },
            binaryFeatures: {
              garage: null,
              garden: null,
              parking: null,
              newBuild: null
            },
            additionalCriteria: [],
            customPreferences: [],
            enhancedAnalytics: null,
            failedAnalysis: [{
              preference: 'Comprehensive Analysis',
              reason: error.message || 'Analysis failed - displaying limited data'
            }],
            userPreferences: userPrefs,
            marketGraphs: null,
            diagnostics: {
              confidence: 0.3,
              missing: ['Most analysis features failed'],
              notes: ['Using minimal fallback data - some features may not be available']
            }
          }
        };
        
        localStorage.setItem('comprehensiveAnalysis', JSON.stringify(fallbackAnalysisData));
        localStorage.setItem('userPreferences', JSON.stringify(userPrefs));
        localStorage.setItem('rightmoveUrl', rightmoveUrl); // Store the URL for time on market calculation
        console.log('💾 Fallback analysis data stored in localStorage');
      } else {
        // No scraped data available - create minimal fallback
        const minimalFallbackData = {
          success: false,
          analysis: {
            basicInfo: {
              propertyAddress: 'Unknown',
              listingPrice: null,
              area: null,
              floorAreaSqm: null,
              numberOfBedrooms: null,
              numberOfBathrooms: null,
              propertyType: null,
              description: '',
              listingUrl: rightmoveUrl
            },
            binaryFeatures: {
              garage: null,
              garden: null,
              parking: null,
              newBuild: null
            },
            additionalCriteria: [],
            customPreferences: [],
            enhancedAnalytics: null,
            failedAnalysis: [{
              preference: 'Property Analysis',
              reason: 'Failed to scrape property data and comprehensive analysis failed'
            }],
            userPreferences: userPrefs,
            marketGraphs: null,
            diagnostics: {
              confidence: 0.1,
              missing: ['All analysis features failed'],
              notes: ['No property data available - analysis completely failed']
            }
          }
        };
        
        localStorage.setItem('comprehensiveAnalysis', JSON.stringify(minimalFallbackData));
        localStorage.setItem('userPreferences', JSON.stringify(userPrefs));
        localStorage.setItem('rightmoveUrl', rightmoveUrl);
        console.log('💾 Minimal fallback data stored in localStorage');
      }
      
      // Show user-friendly error message
      alert('Analysis encountered an error. Showing limited property data. Check console for details.');
      
      // Continue to results page even if analysis fails
      router.push('/results');
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen text-gray-900" style={{backgroundColor: '#368F8B'}}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Back link */}
        <button className="text-sm text-white hover:text-gray-200 mb-6 flex items-center gap-2 cursor-pointer" type="button" onClick={handleBack}>↩ Back to Home Page</button>

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
                    options={["1", "2", "3", "4", "5", "6+"]}
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
                    options={["Flat / Apartment", "Bungalow", "Cottage", "Townhouse", "Mews House", "Terraced House", "End of Terrace", "Semi-Detached House", "Detached House", "Converted Property", "Other"]}
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
                  options={["50-70 sqm", "71-90 sqm", "91-105 sqm", "106-120 sqm", "121-140 sqm", "141-170 sqm", "171+ sqm"]}
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Anything Else</h2>
              <div className="group relative">
                <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center cursor-help text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-600">
                  i
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  Describe any specific requirements (e.g. south-facing garden, near mosque, freehold property) and their importance
                </div>
              </div>
            </div>
            
            {anythingElseEntries.map((entry, index) => (
              <div key={entry.id} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <textarea
                      value={entry.text}
                      onChange={(e) => updateAnythingElseEntry(entry.id, e.target.value)}
                      placeholder="Include anything else that you'd like us to analyse e.g. I want to be local to a church"
                      className="w-full h-24 rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <ImportanceSlider value={entry.importance} onChange={(value) => updateAnythingElseImportance(entry.id, value)} />
                    </div>
                    {anythingElseEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAnythingElseEntry(entry.id)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex justify-start">
              <button
                type="button"
                onClick={addAnythingElseEntry}
                className="px-4 py-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg border border-teal-200 hover:border-teal-300 transition-colors"
              >
                + Add another
              </button>
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
            className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer"
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
              setAnythingElseEntries([{ id: '1', text: '', importance: 5 }]);
            }}
          >
            Reset
          </button>

          <button
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-black text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
