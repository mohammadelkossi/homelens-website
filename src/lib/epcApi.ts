// EPC (Energy Performance Certificate) API integration
// This module handles fetching property size data from the EPC register

export interface EPCProperty {
  lmk_key: string;
  address1: string;
  address2: string;
  address3: string;
  postcode: string;
  local_authority: string;
  constituency: string;
  inspection_date: string;
  lodgement_date: string;
  energy_rating: string;
  current_energy_rating: string;
  potential_energy_rating: string;
  current_energy_efficiency: number;
  potential_energy_efficiency: number;
  property_type: string;
  built_form: string;
  inspection_type: string;
  local_authority_label: string;
  constituency_label: string;
  county: string;
  lodgement_datetime: string;
  tenure: string;
  transaction_type: string;
  environment_impact_current: number;
  environment_impact_potential: number;
  energy_consumption_current: number;
  energy_consumption_potential: number;
  co2_emissions_current: number;
  co2_emissions_potential: number;
  co2_emissions_current_per_floor_area: number;
  lighting_cost_current: number;
  heating_cost_current: number;
  hot_water_cost_current: number;
  total_floor_area: number;
  floor_height: number;
  floor_level: number;
  flat_top_storey: string;
  flat_storey_count: number;
  main_fuel: string;
  wind_turbine_count: number;
  heat_loss_corridor: string;
  unheated_corridor_length: number;
  floor_dimensions: string;
  photo_supply: string;
  solar_water_heating_flag: string;
  mechanical_ventilation: string;
  address: string;
  local_authority_region: string;
  constituency_region: string;
  postcode_region: string;
  postcode_start: string;
  postcode_end: string;
  postcode_pc1: string;
  postcode_pc2: string;
  postcode_pc3: string;
  postcode_pc4: string;
  postcode_pc5: string;
  postcode_pc6: string;
  postcode_pc7: string;
  postcode_pc8: string;
  postcode_pc9: string;
  postcode_pc10: string;
  postcode_pc11: string;
  postcode_pc12: string;
  postcode_pc13: string;
  postcode_pc14: string;
  postcode_pc15: string;
  postcode_pc16: string;
  postcode_pc17: string;
  postcode_pc18: string;
  postcode_pc19: string;
  postcode_pc20: string;
  postcode_pc21: string;
  postcode_pc22: string;
  postcode_pc23: string;
  postcode_pc24: string;
  postcode_pc25: string;
  postcode_pc26: string;
  postcode_pc27: string;
  postcode_pc28: string;
  postcode_pc29: string;
  postcode_pc30: string;
  postcode_pc31: string;
  postcode_pc32: string;
  postcode_pc33: string;
  postcode_pc34: string;
  postcode_pc35: string;
  postcode_pc36: string;
  postcode_pc37: string;
  postcode_pc38: string;
  postcode_pc39: string;
  postcode_pc40: string;
  postcode_pc41: string;
  postcode_pc42: string;
  postcode_pc43: string;
  postcode_pc44: string;
  postcode_pc45: string;
  postcode_pc46: string;
  postcode_pc47: string;
  postcode_pc48: string;
  postcode_pc49: string;
  postcode_pc50: string;
  postcode_pc51: string;
  postcode_pc52: string;
  postcode_pc53: string;
  postcode_pc54: string;
  postcode_pc55: string;
  postcode_pc56: string;
  postcode_pc57: string;
  postcode_pc58: string;
  postcode_pc59: string;
  postcode_pc60: string;
  postcode_pc61: string;
  postcode_pc62: string;
  postcode_pc63: string;
  postcode_pc64: string;
  postcode_pc65: string;
  postcode_pc66: string;
  postcode_pc67: string;
  postcode_pc68: string;
  postcode_pc69: string;
  postcode_pc70: string;
  postcode_pc71: string;
  postcode_pc72: string;
  postcode_pc73: string;
  postcode_pc74: string;
  postcode_pc75: string;
  postcode_pc76: string;
  postcode_pc77: string;
  postcode_pc78: string;
  postcode_pc79: string;
  postcode_pc80: string;
  postcode_pc81: string;
  postcode_pc82: string;
  postcode_pc83: string;
  postcode_pc84: string;
  postcode_pc85: string;
  postcode_pc86: string;
  postcode_pc87: string;
  postcode_pc88: string;
  postcode_pc89: string;
  postcode_pc90: string;
  postcode_pc91: string;
  postcode_pc92: string;
  postcode_pc93: string;
  postcode_pc94: string;
  postcode_pc95: string;
  postcode_pc96: string;
  postcode_pc97: string;
  postcode_pc98: string;
  postcode_pc99: string;
  postcode_pc100: string;
}

export interface EPCResponse {
  success: boolean;
  data?: EPCProperty[];
  error?: string;
  totalCount?: number;
}

export interface PricePerSqmAnalysis {
  postcode: string;
  propertyType: string;
  year: number;
  averagePricePerSqm: number;
  medianPricePerSqm: number;
  minPricePerSqm: number;
  maxPricePerSqm: number;
  totalProperties: number;
  priceRange: string;
  confidence: 'high' | 'medium' | 'low';
}

// EPC API base URL (using the Open Data Communities platform)
const EPC_API_BASE = 'https://epc.opendatacommunities.org/api/v1/domestic/search';

// Mock EPC data for demonstration when API key is not available
function getMockEPCData(postcode: string, propertyType?: string): EPCProperty[] {
  return [
    {
      lmk_key: 'mock-epc-1',
      postcode: postcode,
      address1: '123 Sample Street',
      built_form: propertyType || 'Semi-Detached',
      total_floor_area: 120,
      property_type: 'House',
      address: `123 Sample Street, ${postcode}`,
      local_authority: 'Test Council',
      constituency: 'Test Constituency',
      inspection_date: '2023-01-15',
      lodgement_date: '2023-01-15',
      energy_rating: 'C',
      current_energy_rating: 'C',
      potential_energy_rating: 'B',
      current_energy_efficiency: 70,
      potential_energy_efficiency: 80,
      property_type: 'House',
      inspection_type: 'RdSAP',
      local_authority_label: 'Test Council',
      constituency_label: 'Test Constituency',
      county: 'Test County',
      lodgement_datetime: '2023-01-15T10:00:00Z',
      tenure: 'Owner-occupied',
      transaction_type: 'marketed sale',
      environment_impact_current: 45,
      environment_impact_potential: 35,
      energy_consumption_current: 250,
      energy_consumption_potential: 200,
      co2_emissions_current: 2.5,
      co2_emissions_potential: 2.0,
      co2_emissions_current_per_floor_area: 20.8,
      lighting_cost_current: 50,
      heating_cost_current: 200,
      hot_water_cost_current: 30,
      total_floor_area: 120,
      floor_height: 2.4,
      floor_level: 0,
      flat_top_storey: 'N',
      flat_storey_count: 0,
      main_fuel: 'Natural gas',
      wind_turbine_count: 0,
      heat_loss_corridor: 'N',
      unheated_corridor_length: 0,
      floor_dimensions: '12m x 10m',
      photo_supply: 'Y',
      solar_water_heating_flag: 'N',
      mechanical_ventilation: 'N',
      address: `123 Sample Street, ${postcode}`,
      local_authority_region: 'Test Region',
      constituency_region: 'Test Region',
      postcode_region: 'Test Region',
      postcode_start: postcode.substring(0, 2),
      postcode_end: postcode.substring(2),
      postcode_pc1: postcode.substring(0, 1),
      postcode_pc2: postcode.substring(1, 2),
      postcode_pc3: postcode.substring(2, 3),
      postcode_pc4: postcode.substring(3, 4),
      postcode_pc5: postcode.substring(4, 5),
      postcode_pc6: postcode.substring(5, 6),
      postcode_pc7: postcode.substring(6, 7),
      postcode_pc8: postcode.substring(7, 8),
      postcode_pc9: postcode.substring(8, 9),
      postcode_pc10: postcode.substring(9, 10),
      postcode_pc11: postcode.substring(10, 11),
      postcode_pc12: postcode.substring(11, 12),
      postcode_pc13: postcode.substring(12, 13),
      postcode_pc14: postcode.substring(13, 14),
      postcode_pc15: postcode.substring(14, 15),
      postcode_pc16: postcode.substring(15, 16),
      postcode_pc17: postcode.substring(16, 17),
      postcode_pc18: postcode.substring(17, 18),
      postcode_pc19: postcode.substring(18, 19),
      postcode_pc20: postcode.substring(19, 20),
      postcode_pc21: postcode.substring(20, 21),
      postcode_pc22: postcode.substring(21, 22),
      postcode_pc23: postcode.substring(22, 23),
      postcode_pc24: postcode.substring(23, 24),
      postcode_pc25: postcode.substring(24, 25),
      postcode_pc26: postcode.substring(25, 26),
      postcode_pc27: postcode.substring(26, 27),
      postcode_pc28: postcode.substring(27, 28),
      postcode_pc29: postcode.substring(28, 29),
      postcode_pc30: postcode.substring(29, 30),
      postcode_pc31: postcode.substring(30, 31),
      postcode_pc32: postcode.substring(31, 32),
      postcode_pc33: postcode.substring(32, 33),
      postcode_pc34: postcode.substring(33, 34),
      postcode_pc35: postcode.substring(34, 35),
      postcode_pc36: postcode.substring(35, 36),
      postcode_pc37: postcode.substring(36, 37),
      postcode_pc38: postcode.substring(37, 38),
      postcode_pc39: postcode.substring(38, 39),
      postcode_pc40: postcode.substring(39, 40),
      postcode_pc41: postcode.substring(40, 41),
      postcode_pc42: postcode.substring(41, 42),
      postcode_pc43: postcode.substring(42, 43),
      postcode_pc44: postcode.substring(43, 44),
      postcode_pc45: postcode.substring(44, 45),
      postcode_pc46: postcode.substring(45, 46),
      postcode_pc47: postcode.substring(46, 47),
      postcode_pc48: postcode.substring(47, 48),
      postcode_pc49: postcode.substring(48, 49),
      postcode_pc50: postcode.substring(49, 50),
      postcode_pc51: postcode.substring(50, 51),
      postcode_pc52: postcode.substring(51, 52),
      postcode_pc53: postcode.substring(52, 53),
      postcode_pc54: postcode.substring(53, 54),
      postcode_pc55: postcode.substring(54, 55),
      postcode_pc56: postcode.substring(55, 56),
      postcode_pc57: postcode.substring(56, 57),
      postcode_pc58: postcode.substring(57, 58),
      postcode_pc59: postcode.substring(58, 59),
      postcode_pc60: postcode.substring(59, 60),
      postcode_pc61: postcode.substring(60, 61),
      postcode_pc62: postcode.substring(61, 62),
      postcode_pc63: postcode.substring(62, 63),
      postcode_pc64: postcode.substring(63, 64),
      postcode_pc65: postcode.substring(64, 65),
      postcode_pc66: postcode.substring(65, 66),
      postcode_pc67: postcode.substring(66, 67),
      postcode_pc68: postcode.substring(67, 68),
      postcode_pc69: postcode.substring(68, 69),
      postcode_pc70: postcode.substring(69, 70),
      postcode_pc71: postcode.substring(70, 71),
      postcode_pc72: postcode.substring(71, 72),
      postcode_pc73: postcode.substring(72, 73),
      postcode_pc74: postcode.substring(73, 74),
      postcode_pc75: postcode.substring(74, 75),
      postcode_pc76: postcode.substring(75, 76),
      postcode_pc77: postcode.substring(76, 77),
      postcode_pc78: postcode.substring(77, 78),
      postcode_pc79: postcode.substring(78, 79),
      postcode_pc80: postcode.substring(79, 80),
      postcode_pc81: postcode.substring(80, 81),
      postcode_pc82: postcode.substring(81, 82),
      postcode_pc83: postcode.substring(82, 83),
      postcode_pc84: postcode.substring(83, 84),
      postcode_pc85: postcode.substring(84, 85),
      postcode_pc86: postcode.substring(85, 86),
      postcode_pc87: postcode.substring(86, 87),
      postcode_pc88: postcode.substring(87, 88),
      postcode_pc89: postcode.substring(88, 89),
      postcode_pc90: postcode.substring(89, 90),
      postcode_pc91: postcode.substring(90, 91),
      postcode_pc92: postcode.substring(91, 92),
      postcode_pc93: postcode.substring(92, 93),
      postcode_pc94: postcode.substring(93, 94),
      postcode_pc95: postcode.substring(94, 95),
      postcode_pc96: postcode.substring(95, 96),
      postcode_pc97: postcode.substring(96, 97),
      postcode_pc98: postcode.substring(97, 98),
      postcode_pc99: postcode.substring(98, 99),
      postcode_pc100: postcode.substring(99, 100)
    },
    {
      lmk_key: 'mock-epc-2',
      postcode: postcode,
      address1: '456 Example Road',
      built_form: propertyType || 'Semi-Detached',
      total_floor_area: 95,
      property_type: 'House',
      address: `456 Example Road, ${postcode}`,
      local_authority: 'Test Council',
      constituency: 'Test Constituency',
      inspection_date: '2023-02-20',
      lodgement_date: '2023-02-20',
      energy_rating: 'D',
      current_energy_rating: 'D',
      potential_energy_rating: 'C',
      current_energy_efficiency: 60,
      potential_energy_efficiency: 75,
      property_type: 'House',
      inspection_type: 'RdSAP',
      local_authority_label: 'Test Council',
      constituency_label: 'Test Constituency',
      county: 'Test County',
      lodgement_datetime: '2023-02-20T14:30:00Z',
      tenure: 'Owner-occupied',
      transaction_type: 'marketed sale',
      environment_impact_current: 50,
      environment_impact_potential: 40,
      energy_consumption_current: 280,
      energy_consumption_potential: 220,
      co2_emissions_current: 2.8,
      co2_emissions_potential: 2.2,
      co2_emissions_current_per_floor_area: 29.5,
      lighting_cost_current: 45,
      heating_cost_current: 180,
      hot_water_cost_current: 25,
      total_floor_area: 95,
      floor_height: 2.3,
      floor_level: 0,
      flat_top_storey: 'N',
      flat_storey_count: 0,
      main_fuel: 'Natural gas',
      wind_turbine_count: 0,
      heat_loss_corridor: 'N',
      unheated_corridor_length: 0,
      floor_dimensions: '9.5m x 10m',
      photo_supply: 'Y',
      solar_water_heating_flag: 'N',
      mechanical_ventilation: 'N',
      address: `456 Example Road, ${postcode}`,
      local_authority_region: 'Test Region',
      constituency_region: 'Test Region',
      postcode_region: 'Test Region',
      postcode_start: postcode.substring(0, 2),
      postcode_end: postcode.substring(2),
      postcode_pc1: postcode.substring(0, 1),
      postcode_pc2: postcode.substring(1, 2),
      postcode_pc3: postcode.substring(2, 3),
      postcode_pc4: postcode.substring(3, 4),
      postcode_pc5: postcode.substring(4, 5),
      postcode_pc6: postcode.substring(5, 6),
      postcode_pc7: postcode.substring(6, 7),
      postcode_pc8: postcode.substring(7, 8),
      postcode_pc9: postcode.substring(8, 9),
      postcode_pc10: postcode.substring(9, 10),
      postcode_pc11: postcode.substring(10, 11),
      postcode_pc12: postcode.substring(11, 12),
      postcode_pc13: postcode.substring(12, 13),
      postcode_pc14: postcode.substring(13, 14),
      postcode_pc15: postcode.substring(14, 15),
      postcode_pc16: postcode.substring(15, 16),
      postcode_pc17: postcode.substring(16, 17),
      postcode_pc18: postcode.substring(17, 18),
      postcode_pc19: postcode.substring(18, 19),
      postcode_pc20: postcode.substring(19, 20),
      postcode_pc21: postcode.substring(20, 21),
      postcode_pc22: postcode.substring(21, 22),
      postcode_pc23: postcode.substring(22, 23),
      postcode_pc24: postcode.substring(23, 24),
      postcode_pc25: postcode.substring(24, 25),
      postcode_pc26: postcode.substring(25, 26),
      postcode_pc27: postcode.substring(26, 27),
      postcode_pc28: postcode.substring(27, 28),
      postcode_pc29: postcode.substring(28, 29),
      postcode_pc30: postcode.substring(29, 30),
      postcode_pc31: postcode.substring(30, 31),
      postcode_pc32: postcode.substring(31, 32),
      postcode_pc33: postcode.substring(32, 33),
      postcode_pc34: postcode.substring(33, 34),
      postcode_pc35: postcode.substring(34, 35),
      postcode_pc36: postcode.substring(35, 36),
      postcode_pc37: postcode.substring(36, 37),
      postcode_pc38: postcode.substring(37, 38),
      postcode_pc39: postcode.substring(38, 39),
      postcode_pc40: postcode.substring(39, 40),
      postcode_pc41: postcode.substring(40, 41),
      postcode_pc42: postcode.substring(41, 42),
      postcode_pc43: postcode.substring(42, 43),
      postcode_pc44: postcode.substring(43, 44),
      postcode_pc45: postcode.substring(44, 45),
      postcode_pc46: postcode.substring(45, 46),
      postcode_pc47: postcode.substring(46, 47),
      postcode_pc48: postcode.substring(47, 48),
      postcode_pc49: postcode.substring(48, 49),
      postcode_pc50: postcode.substring(49, 50),
      postcode_pc51: postcode.substring(50, 51),
      postcode_pc52: postcode.substring(51, 52),
      postcode_pc53: postcode.substring(52, 53),
      postcode_pc54: postcode.substring(53, 54),
      postcode_pc55: postcode.substring(54, 55),
      postcode_pc56: postcode.substring(55, 56),
      postcode_pc57: postcode.substring(56, 57),
      postcode_pc58: postcode.substring(57, 58),
      postcode_pc59: postcode.substring(58, 59),
      postcode_pc60: postcode.substring(59, 60),
      postcode_pc61: postcode.substring(60, 61),
      postcode_pc62: postcode.substring(61, 62),
      postcode_pc63: postcode.substring(62, 63),
      postcode_pc64: postcode.substring(63, 64),
      postcode_pc65: postcode.substring(64, 65),
      postcode_pc66: postcode.substring(65, 66),
      postcode_pc67: postcode.substring(66, 67),
      postcode_pc68: postcode.substring(67, 68),
      postcode_pc69: postcode.substring(68, 69),
      postcode_pc70: postcode.substring(69, 70),
      postcode_pc71: postcode.substring(70, 71),
      postcode_pc72: postcode.substring(71, 72),
      postcode_pc73: postcode.substring(72, 73),
      postcode_pc74: postcode.substring(73, 74),
      postcode_pc75: postcode.substring(74, 75),
      postcode_pc76: postcode.substring(75, 76),
      postcode_pc77: postcode.substring(76, 77),
      postcode_pc78: postcode.substring(77, 78),
      postcode_pc79: postcode.substring(78, 79),
      postcode_pc80: postcode.substring(79, 80),
      postcode_pc81: postcode.substring(80, 81),
      postcode_pc82: postcode.substring(81, 82),
      postcode_pc83: postcode.substring(82, 83),
      postcode_pc84: postcode.substring(83, 84),
      postcode_pc85: postcode.substring(84, 85),
      postcode_pc86: postcode.substring(85, 86),
      postcode_pc87: postcode.substring(86, 87),
      postcode_pc88: postcode.substring(87, 88),
      postcode_pc89: postcode.substring(88, 89),
      postcode_pc90: postcode.substring(89, 90),
      postcode_pc91: postcode.substring(90, 91),
      postcode_pc92: postcode.substring(91, 92),
      postcode_pc93: postcode.substring(92, 93),
      postcode_pc94: postcode.substring(93, 94),
      postcode_pc95: postcode.substring(94, 95),
      postcode_pc96: postcode.substring(95, 96),
      postcode_pc97: postcode.substring(96, 97),
      postcode_pc98: postcode.substring(97, 98),
      postcode_pc99: postcode.substring(98, 99),
      postcode_pc100: postcode.substring(99, 100)
    }
  ];
}

export async function fetchEPCData(
  postcode: string,
  propertyType?: string,
  limit: number = 100,
  apiKey?: string,
  email?: string
): Promise<EPCResponse> {
  try {
    console.log(`🏠 Fetching EPC data for postcode: ${postcode}`);
    
    // Use provided API key or default to the user's key
    const keyToUse = apiKey || 'e4f4035c1f31d4d3cde622673f50f84279213f42';
    const emailToUse = email || 'your-email@example.com'; // User needs to provide their email
    
    if (!keyToUse || !emailToUse || emailToUse === 'your-email@example.com') {
      console.warn('⚠️  No EPC API key or email provided. Using mock data for demonstration.');
      return {
        success: true,
        data: getMockEPCData(postcode, propertyType),
        totalCount: 2
      };
    }
    
    // Build query parameters
    const params = new URLSearchParams({
      postcode: postcode,
      size: limit.toString(),
      from: '0'
    });

    if (propertyType) {
      params.append('built-form', propertyType);
    }

    const url = `${EPC_API_BASE}?${params.toString()}`;
    console.log(`🔗 EPC API URL: ${url}`);

    // Use HTTP Basic Auth with email:apiKey format
    const authString = Buffer.from(`${emailToUse}:${keyToUse}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`, // EPC API uses Basic auth with email:apiKey
        'User-Agent': 'HomeLens-Property-Analysis/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`EPC API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ EPC data fetched: ${data.rows?.length || 0} properties`);

    return {
      success: true,
      data: data.rows || [],
      totalCount: data.total_rows || 0
    };

  } catch (error) {
    console.error('❌ EPC API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function matchPropertyWithEPC(
  landRegistryProperty: any,
  epcProperties: EPCProperty[]
): EPCProperty | null {
  // Try to match by postcode and address similarity
  const postcode = landRegistryProperty['Postcode']?.toUpperCase();
  const address = landRegistryProperty['PAON']?.toLowerCase();
  
  if (!postcode || !address) return null;

  // Find EPC properties with matching postcode
  const matchingEPC = epcProperties.filter(epc => 
    epc.postcode?.toUpperCase() === postcode
  );

  if (matchingEPC.length === 0) return null;

  // Try to match by address similarity
  for (const epc of matchingEPC) {
    const epcAddress = epc.address1?.toLowerCase() || '';
    if (epcAddress.includes(address) || address.includes(epcAddress.split(' ')[0])) {
      return epc;
    }
  }

  // Return first match if no address similarity found
  return matchingEPC[0];
}

export function calculatePricePerSqm(
  price: number,
  totalFloorArea: number
): number | null {
  if (!price || !totalFloorArea || totalFloorArea <= 0) {
    return null;
  }
  
  return Math.round(price / totalFloorArea);
}

export async function analyzePricePerSqm(
  postcode: string,
  propertyType: string,
  year: number,
  landRegistryData: any[],
  epcApiKey?: string,
  epcEmail?: string
): Promise<PricePerSqmAnalysis | null> {
  try {
    console.log(`📊 Analyzing price per sqm for ${propertyType} in ${postcode} for ${year}`);
    
    // Fetch EPC data for the postcode
    const epcResponse = await fetchEPCData(postcode, propertyType, 100, epcApiKey, epcEmail);
    
    if (!epcResponse.success || !epcResponse.data) {
      console.log('❌ Failed to fetch EPC data');
      return null;
    }

    // Filter Land Registry data for the specific year and property type
    const filteredSales = landRegistryData.filter(sale => {
      const saleYear = new Date(sale['Date of Transfer']).getFullYear();
      const salePropertyType = sale['Property Type'];
      return saleYear === year && salePropertyType === propertyType;
    });

    if (filteredSales.length === 0) {
      console.log(`❌ No sales data found for ${propertyType} in ${postcode} for ${year}`);
      return null;
    }

    // Match properties and calculate price per sqm
    const pricePerSqmData: number[] = [];
    
    for (const sale of filteredSales) {
      const epcProperty = matchPropertyWithEPC(sale, epcResponse.data);
      
      if (epcProperty && epcProperty.total_floor_area) {
        const price = parseInt(sale['Price Paid']) || 0;
        const pricePerSqm = calculatePricePerSqm(price, epcProperty.total_floor_area);
        
        if (pricePerSqm) {
          pricePerSqmData.push(pricePerSqm);
        }
      }
    }

    if (pricePerSqmData.length === 0) {
      console.log('❌ No matching EPC data found for price per sqm calculation');
      return null;
    }

    // Calculate statistics
    const averagePricePerSqm = Math.round(
      pricePerSqmData.reduce((sum, price) => sum + price, 0) / pricePerSqmData.length
    );
    
    const sortedPrices = pricePerSqmData.sort((a, b) => a - b);
    const medianPricePerSqm = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const minPricePerSqm = Math.min(...pricePerSqmData);
    const maxPricePerSqm = Math.max(...pricePerSqmData);

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (pricePerSqmData.length >= 10) confidence = 'high';
    else if (pricePerSqmData.length >= 5) confidence = 'medium';

    console.log(`✅ Analysis complete: ${pricePerSqmData.length} properties analyzed`);

    return {
      postcode,
      propertyType,
      year,
      averagePricePerSqm,
      medianPricePerSqm,
      minPricePerSqm,
      maxPricePerSqm,
      totalProperties: pricePerSqmData.length,
      priceRange: `${minPricePerSqm.toLocaleString()} - ${maxPricePerSqm.toLocaleString()}`,
      confidence
    };

  } catch (error) {
    console.error('❌ Price per sqm analysis error:', error);
    return null;
  }
}

// Helper function to get property type mapping
export function mapPropertyTypeToEPC(landRegistryType: string): string {
  const mapping: { [key: string]: string } = {
    'D': 'Detached',
    'S': 'Semi-Detached',
    'T': 'Terraced',
    'F': 'Flat',
    'O': 'Other'
  };
  
  return mapping[landRegistryType] || 'Other';
}
