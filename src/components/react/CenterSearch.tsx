import { useState, useMemo } from 'react';

interface Center {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website?: string;
  lanes?: number;
  features?: string[];
}

interface Props {
  centers: Center[];
}

export default function CenterSearch({ centers }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCenters = useMemo(() => {
    if (!searchTerm) return centers;
    
    const term = searchTerm.toLowerCase();
    return centers.filter(
      (center) =>
        center.name.toLowerCase().includes(term) ||
        center.city.toLowerCase().includes(term) ||
        center.features?.some((f) => f.toLowerCase().includes(term))
    );
  }, [centers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, city, or features..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Showing {filteredCenters.length} of {centers.length} centers
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCenters.map((center, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-display font-bold text-xl mb-3 text-gray-900">
              {center.name}
            </h3>
            <div className="space-y-2 text-gray-700">
              <p>{center.address}</p>
              <p>
                {center.city}, {center.state} {center.zip}
              </p>
              <p className="font-semibold">{center.phone}</p>
              {center.website && (
                <a
                  href={center.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 inline-block mt-2"
                >
                  Visit Website →
                </a>
              )}
              {center.lanes && (
                <p className="text-sm text-gray-600 mt-3">
                  <strong>Lanes:</strong> {center.lanes}
                </p>
              )}
              {center.features && center.features.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Features:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {center.features.map((feature, i) => (
                      <li key={i}>• {feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCenters.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No centers found matching your search.
        </div>
      )}
    </div>
  );
}
