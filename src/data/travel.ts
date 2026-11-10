/** Every place visited, in the order listed. Coordinates are city centres. */

export interface Place {
  readonly name: string;
  readonly country: string;
  readonly lat: number;
  readonly lon: number;
}

export const places: readonly Place[] = [
  { name: 'Gurugram', country: 'India', lat: 28.46, lon: 77.03 },
  { name: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 },
  { name: 'Noida', country: 'India', lat: 28.54, lon: 77.39 },
  { name: 'Haridwar', country: 'India', lat: 29.95, lon: 78.16 },
  { name: 'Rishikesh', country: 'India', lat: 30.09, lon: 78.27 },
  { name: 'Kedarnath', country: 'India', lat: 30.73, lon: 79.07 },
  { name: 'Badrinath', country: 'India', lat: 30.74, lon: 79.49 },
  { name: 'Bathinda', country: 'India', lat: 30.21, lon: 74.95 },
  { name: 'Abohar', country: 'India', lat: 30.14, lon: 74.2 },
  { name: 'Chandigarh', country: 'India', lat: 30.73, lon: 76.78 },
  { name: 'Ludhiana', country: 'India', lat: 30.9, lon: 75.86 },
  { name: 'Jalandhar', country: 'India', lat: 31.33, lon: 75.58 },
  { name: 'Amritsar', country: 'India', lat: 31.63, lon: 74.87 },
  // A region: the pin sits on Srinagar.
  { name: 'Kashmir', country: 'India', lat: 34.08, lon: 74.8 },
  { name: 'Jammu', country: 'India', lat: 32.73, lon: 74.86 },
  { name: 'Ambala', country: 'India', lat: 30.38, lon: 76.78 },
  { name: 'Dehradun', country: 'India', lat: 30.32, lon: 78.03 },
  { name: 'Chennai', country: 'India', lat: 13.08, lon: 80.27 },
  { name: 'Bengaluru', country: 'India', lat: 12.97, lon: 77.59 },
  { name: 'Kolkata', country: 'India', lat: 22.57, lon: 88.36 },
  { name: 'Jaipur', country: 'India', lat: 26.92, lon: 75.82 },
  { name: 'Ajmer', country: 'India', lat: 26.45, lon: 74.64 },
  { name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88 },
  { name: 'Vellore', country: 'India', lat: 12.92, lon: 79.13 },
  { name: 'Thiruvananthapuram', country: 'India', lat: 8.52, lon: 76.94 },
  { name: 'Coimbatore', country: 'India', lat: 11.02, lon: 76.96 },
  { name: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.47, lon: 54.37 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2, lon: 55.27 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.75, lon: 100.5 },
  { name: 'Antalya', country: 'Türkiye', lat: 36.89, lon: 30.7 },
  // A region: the pin sits on Göreme.
  { name: 'Cappadocia', country: 'Türkiye', lat: 38.64, lon: 34.83 },
  { name: 'Istanbul', country: 'Türkiye', lat: 41.01, lon: 28.96 },
  { name: 'San Francisco', country: 'United States', lat: 37.77, lon: -122.42 },
  { name: 'New York', country: 'United States', lat: 40.71, lon: -74.01 },
  { name: 'Dallas', country: 'United States', lat: 32.78, lon: -96.8 },
  { name: 'Houston', country: 'United States', lat: 29.76, lon: -95.37 },
  { name: 'Denver', country: 'United States', lat: 39.74, lon: -104.99 },
  { name: 'Las Vegas', country: 'United States', lat: 36.17, lon: -115.14 },
  { name: 'Los Angeles', country: 'United States', lat: 34.05, lon: -118.24 },
  { name: 'Phoenix', country: 'United States', lat: 33.45, lon: -112.07 },
  { name: 'Washington, D.C.', country: 'United States', lat: 38.91, lon: -77.04 },
  { name: 'Baltimore', country: 'United States', lat: 39.29, lon: -76.62 },
  { name: 'Sedona', country: 'United States', lat: 34.87, lon: -111.76 },
  { name: 'Scottsdale', country: 'United States', lat: 33.49, lon: -111.93 },
  { name: 'Tempe', country: 'United States', lat: 33.41, lon: -111.94 },
  { name: 'Austin', country: 'United States', lat: 30.27, lon: -97.74 },
  { name: 'San Antonio', country: 'United States', lat: 29.42, lon: -98.49 },
  // A state: the pin sits on Oklahoma City.
  { name: 'Oklahoma', country: 'United States', lat: 35.47, lon: -97.52 },
  // A state: the pin sits on its capital, Trenton.
  { name: 'New Jersey', country: 'United States', lat: 40.22, lon: -74.77 },
  { name: 'Udaipur', country: 'India', lat: 24.58, lon: 73.68 },
  { name: 'Jaisalmer', country: 'India', lat: 26.91, lon: 70.92 },
  { name: 'Jodhpur', country: 'India', lat: 26.28, lon: 73.02 },
  { name: 'Pathankot', country: 'India', lat: 32.27, lon: 75.65 },
  // Una in Himachal Pradesh, beside Pathankot.
  { name: 'Una', country: 'India', lat: 31.47, lon: 76.27 },
  { name: 'Gangtok', country: 'India', lat: 27.33, lon: 88.62 },
  { name: 'Darjeeling', country: 'India', lat: 27.04, lon: 88.26 },
  // From OpenStreetMap: Wikipedia's summary writes Pelling's degrees and minutes as decimals.
  { name: 'Pelling', country: 'India', lat: 27.3, lon: 88.24 },
  { name: 'Kalimpong', country: 'India', lat: 27.06, lon: 88.47 },
  { name: 'Chicago', country: 'United States', lat: 41.88, lon: -87.63 },
  // A state: the pin sits on its capital, Richmond.
  { name: 'Virginia', country: 'United States', lat: 37.54, lon: -77.44 },
  { name: 'San Jose', country: 'United States', lat: 37.34, lon: -121.89 },
];
