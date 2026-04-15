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

export const formatRangeMetric = (miles) => {
  return Math.round(miles);
};

export const whPerKmToWhPerMi = (whPerKm) => {
  return whPerKm * 1.60934;
};

export const formatEfficiency = (whPerKm) => {
  const whPerMi = whPerKmToWhPerMi(whPerKm);
  return Math.round(whPerMi * 10) / 10;
};
