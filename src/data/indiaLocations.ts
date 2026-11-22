export const INDIA_STATE_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada', 'Amaravati'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
  'Chandigarh': ['Chandigarh'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'Dwarka', 'Rohini'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Zuarinagar'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  'Haryana': ['Gurugram', 'Faridabad', 'Kurukshetra', 'Rohtak', 'Panipat', 'Sonipat'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Hamirpur', 'Solan', 'Dharamshala'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Katra'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Manipal', 'Hubballi', 'Belagavi'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Palakkad'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Chhatrapati Sambhajinagar', 'Thane', 'Navi Mumbai'],
  'Manipur': ['Imphal'],
  'Meghalaya': ['Shillong'],
  'Mizoram': ['Aizawl'],
  'Nagaland': ['Kohima', 'Dimapur'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur'],
  'Puducherry': ['Puducherry', 'Karaikal'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Mohali', 'Phagwara'],
  'Rajasthan': ['Jaipur', 'Pilani', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Sikkim': ['Gangtok'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Tiruchirappalli', 'Vellore', 'Madurai', 'Salem', 'Thanjavur'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam'],
  'Tripura': ['Agartala'],
  'Uttar Pradesh': ['Kanpur', 'Lucknow', 'Noida', 'Greater Noida', 'Varanasi', 'Prayagraj', 'Ghaziabad', 'Agra'],
  'Uttarakhand': ['Roorkee', 'Dehradun', 'Haldwani', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'Kharagpur', 'Durgapur', 'Howrah', 'Siliguri'],
};

export const INDIA_STATES: string[] = Object.keys(INDIA_STATE_CITIES).sort((a, b) =>
  a.localeCompare(b)
);

export function getCitiesForState(stateName: string): string[] {
  if (!stateName) {
    const all = new Set<string>();
    Object.values(INDIA_STATE_CITIES).forEach((cities) => {
      cities.forEach((c) => all.add(c));
    });
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }
  return INDIA_STATE_CITIES[stateName] || [];
}

export function findStateByCity(cityName: string): string {
  if (!cityName) return '';
  const target = cityName.trim().toLowerCase();
  for (const [state, cities] of Object.entries(INDIA_STATE_CITIES)) {
    if (cities.some((c) => c.toLowerCase() === target)) {
      return state;
    }
  }
  return '';
}

export function matchCanonicalState(rawState: string): string {
  const cleaned = rawState.trim();
  if (!cleaned) return '';
  const lower = cleaned.toLowerCase();
  const exact = INDIA_STATES.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;
  if (lower.includes('delhi')) return 'Delhi';
  const partial = INDIA_STATES.find(
    (s) => lower.includes(s.toLowerCase()) || s.toLowerCase().includes(lower)
  );
  return partial || cleaned;
}
