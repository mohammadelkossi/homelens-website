import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationPreference, propertyAddress } = body;

    if (!locationPreference || !propertyAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing locationPreference or propertyAddress',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('🗺️ Analyzing location preference:', locationPreference);
    console.log('🏠 Property address:', propertyAddress);

    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleMapsApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Maps API key not configured',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Extract the type of location the user is looking for
    const locationTypes = {
      'gym': ['gym', 'fitness', 'sports', 'exercise'],
      'place_of_worship': ['mosque', 'church', 'synagogue', 'temple', 'chapel', 'cathedral', 'religious', 'prayer', 'worship', 'islamic', 'christian', 'jewish', 'hindu', 'buddhist', 'sikh'],
      'school': ['school', 'education', 'primary', 'secondary', 'college'],
      'hospital': ['hospital', 'medical', 'health', 'clinic'],
      'shopping': ['shopping', 'mall', 'retail', 'supermarket'],
      'transport': ['station', 'bus', 'train', 'metro', 'tube'],
      'restaurant': ['restaurant', 'food', 'dining', 'cafe']
    };

    // Check if this is a postcode preference
    const postcodePattern = /[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i;
    const isPostcodePreference = postcodePattern.test(locationPreference);

    // Determine what type of location the user is looking for
    let targetLocationType = null;
    let searchQuery = locationPreference.toLowerCase();

    if (isPostcodePreference) {
      // This is a postcode preference - we'll calculate distance to the postcode area
      targetLocationType = 'postcode';
    } else {
      for (const [type, keywords] of Object.entries(locationTypes)) {
        if (keywords.some(keyword => searchQuery.includes(keyword))) {
          targetLocationType = type;
          break;
        }
      }
    }

    if (!targetLocationType) {
      return NextResponse.json({
        success: false,
        error: 'Could not determine location type from preference',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('🎯 Target location type:', targetLocationType);

    // Step 1: Geocode the property address to get coordinates
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(propertyAddress)}&key=${googleMapsApiKey}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (!geocodeData.results || geocodeData.results.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not find coordinates for property address',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const propertyLocation = geocodeData.results[0].geometry.location;
    console.log('📍 Property coordinates:', propertyLocation);

    // Step 2: Handle different location types
    let placesUrl;
    let placesData;
    
    if (targetLocationType === 'postcode') {
      // For postcode preferences, geocode the target postcode and calculate distance
      const targetPostcode = locationPreference.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i)?.[0];
      if (!targetPostcode) {
        return NextResponse.json({
          success: false,
          error: 'Could not extract postcode from preference',
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
      
      console.log('📍 Geocoding target postcode:', targetPostcode);
      const targetGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(targetPostcode)}&key=${googleMapsApiKey}`;
      const targetGeocodeResponse = await fetch(targetGeocodeUrl);
      const targetGeocodeData = await targetGeocodeResponse.json();
      
      if (!targetGeocodeData.results || targetGeocodeData.results.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Could not find coordinates for target postcode',
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
      
      const targetLocation = targetGeocodeData.results[0].geometry.location;
      const distance = calculateDistance(
        propertyLocation.lat, propertyLocation.lng,
        targetLocation.lat, targetLocation.lng
      );
      
      // Calculate match score based on distance
      let matchScore = 10;
      if (distance <= 1000) { // 1 km
        matchScore = 100;
      } else if (distance <= 2000) { // 2 km
        matchScore = 90;
      } else if (distance <= 5000) { // 5 km
        matchScore = 70;
      } else if (distance <= 10000) { // 10 km
        matchScore = 50;
      } else if (distance <= 20000) { // 20 km
        matchScore = 30;
      } else {
        matchScore = 10;
      }
      
      return NextResponse.json({
        success: true,
        label: `Distance to ${targetPostcode}`,
        matchScore,
        reasoning: `Property is ${Math.round(distance)} meters from ${targetPostcode}`,
        nearestDistance: Math.round(distance),
        nearestLocation: {
          name: targetPostcode,
          address: targetGeocodeData.results[0].formatted_address,
          lat: targetLocation.lat,
          lng: targetLocation.lng
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // For other location types (gym, school, hospital, etc.)
      if (targetLocationType === 'place_of_worship') {
        // For places of worship, we'll search for establishments and filter by name/type
        placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${propertyLocation.lat},${propertyLocation.lng}&radius=5000&keyword=place of worship&key=${googleMapsApiKey}`;
      } else {
        placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${propertyLocation.lat},${propertyLocation.lng}&radius=5000&type=${targetLocationType}&key=${googleMapsApiKey}`;
      }
      
      const placesResponse = await fetch(placesUrl);
      placesData = await placesResponse.json();
    }

    if (targetLocationType !== 'postcode' && (!placesData.results || placesData.results.length === 0)) {
      return NextResponse.json({
        success: true,
        matchScore: 0,
        reasoning: 'No nearby locations of this type found within 5km',
        nearestDistance: null,
        nearestLocation: null,
        timestamp: new Date().toISOString()
      });
    }

    // Step 3: Calculate distances and find the nearest
    const nearestLocation = placesData.results[0];
    const nearestDistance = calculateDistance(
      propertyLocation.lat,
      propertyLocation.lng,
      nearestLocation.geometry.location.lat,
      nearestLocation.geometry.location.lng
    );

    // Step 4: Calculate match score based on distance
    let matchScore = 0;
    let reasoning = '';

    if (nearestDistance <= 500) {
      matchScore = 100;
      reasoning = 'Very close (within 500m)';
    } else if (nearestDistance <= 1000) {
      matchScore = 90;
      reasoning = 'Close (within 1km)';
    } else if (nearestDistance <= 2000) {
      matchScore = 70;
      reasoning = 'Moderate distance (within 2km)';
    } else if (nearestDistance <= 3000) {
      matchScore = 50;
      reasoning = 'Far (within 3km)';
    } else if (nearestDistance <= 5000) {
      matchScore = 30;
      reasoning = 'Very far (within 5km)';
    } else {
      matchScore = 10;
      reasoning = 'Extremely far (over 5km)';
    }

    console.log('📏 Nearest distance:', nearestDistance, 'meters');
    console.log('🎯 Match score:', matchScore);

    return NextResponse.json({
      success: true,
      matchScore,
      reasoning,
      nearestDistance: Math.round(nearestDistance),
      nearestLocation: {
        name: nearestLocation.name,
        address: nearestLocation.vicinity,
        rating: nearestLocation.rating || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing location preference:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze location preference',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
