import businessData from '../data/business-branches.json' with { type: 'json' };

export const { company, workingHours, riyadh } = businessData;

// The Riyadh office and the Dammam branch remain separate entities. Keep the
// existing Riyadh street number and coordinates; the district, postal code,
// Maps URL and opening hours were checked against its connected GBP.
export function companySchema(existing = {}) {
  const node = {
    ...existing,
    '@type': 'GeneralContractor',
    '@id': company.schemaId,
    name: existing.name || company.name,
    url: company.url,
    logo: company.logo,
    telephone: company.telephone,
    email: company.email,
    address: { '@type': 'PostalAddress', ...riyadh.address },
    geo: { '@type': 'GeoCoordinates', ...riyadh.geo },
    hasMap: riyadh.mapsUrl,
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: workingHours.days.map(day => `https://schema.org/${day}`),
      opens: workingHours.opens,
      closes: workingHours.closes,
    }, ...workingHours.closedDays.map(day => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${day}`,
      opens: '00:00', closes: '00:00',
    }))],
  };
  // serviceType belongs to Service, not GeneralContractor.
  delete node.serviceType;
  for (const offer of node.hasOfferCatalog?.itemListElement || []) {
    const service = offer.itemOffered;
    if (service?.['@type'] === 'Service') {
      service.serviceType ||= service.name;
      service.provider ||= { '@id': company.schemaId };
    }
  }
  return node;
}

