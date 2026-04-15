// Unit conversion utilities
export const kmToMiles = (km) => {
  return km * 0.621371;
};

export const formatDistance = (km) => {
  const miles = kmToMiles(km);
  return `${Math.round(miles)} mi`;
};

export const formatDistancePrecise = (km) => {
  const miles = kmToMiles(km);
  return `${miles.toFixed(1)} mi`;
};

export const formatRangeMetric = (km) => {
  const miles = kmToMiles(km);
  return Math.round(miles);
};
