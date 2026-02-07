// CSV to JSON mappers for different collection types

interface CSVRow {
  [key: string]: string;
}

export const mapHonorsCSV = (rows: CSVRow[], filename: string) => {
  // Extract year and category from filename or first row
  const year = new Date().getFullYear();
  const category = filename.replace('.csv', '').replace(/[-_]/g, ' ');

  return {
    year,
    category,
    recipients: rows.map(row => ({
      name: row.Name || row.name || '',
      achievement: row.Achievement || row.achievement || row.Score || '',
      score: parseInt(row.Score || row.score || '0') || undefined,
      date: row.Date || row.date || undefined,
    }))
  };
};

export const mapCentersCSV = (rows: CSVRow[]) => {
  return rows.map(row => ({
    name: row.Name || row.name || '',
    address: row.Address || row.address || '',
    city: row.City || row.city || '',
    state: row.State || row.state || 'WI',
    zip: row.ZIP || row.zip || row.Zip || '',
    phone: row.Phone || row.phone || '',
    email: row.Email || row.email || '',
    website: row.Website || row.website || '',
    lanes: parseInt(row.Lanes || row.lanes || '0') || undefined,
    features: (row.Features || row.features || '').split(',').map(f => f.trim()).filter(Boolean),
  }));
};

export const mapTournamentsCSV = (rows: CSVRow[]) => {
  return rows.map(row => ({
    name: row.Name || row.name || row.Tournament || '',
    date: row.Date || row.date || '',
    location: row.Location || row.location || '',
    description: row.Description || row.description || '',
    entryFee: row['Entry Fee'] || row.entryFee || row.fee || '',
    prizeFund: row['Prize Fund'] || row.prizeFund || row.prize || '',
    rules: row.Rules || row.rules || '',
    status: (row.Status || row.status || 'upcoming') as 'upcoming' | 'completed' | 'registration-open',
  }));
};

export const mapNewsCSV = (rows: CSVRow[]) => {
  return rows.map(row => ({
    title: row.Title || row.title || '',
    date: row.Date || row.date || new Date().toISOString().split('T')[0],
    author: row.Author || row.author || 'GFCBA Staff',
    excerpt: row.Excerpt || row.excerpt || '',
    content: row.Content || row.content || '',
    image: row.Image || row.image || '',
    tags: (row.Tags || row.tags || '').split(',').map(t => t.trim()).filter(Boolean),
  }));
};

// Helper to detect collection type from filename or user selection
export const detectCollectionType = (filename: string): 'honors' | 'tournaments' | 'centers' | 'news' | null => {
  const lower = filename.toLowerCase();
  if (lower.includes('honor') || lower.includes('award') || lower.includes('300') || lower.includes('score')) return 'honors';
  if (lower.includes('tournament')) return 'tournaments';
  if (lower.includes('center') || lower.includes('lane')) return 'centers';
  if (lower.includes('news') || lower.includes('article')) return 'news';
  return null;
};

// Get mapper function based on collection type
export const getMapper = (collectionType: string) => {
  switch (collectionType) {
    case 'honors': return mapHonorsCSV;
    case 'centers': return mapCentersCSV;
    case 'tournaments': return mapTournamentsCSV;
    case 'news': return mapNewsCSV;
    default: return null;
  }
};
