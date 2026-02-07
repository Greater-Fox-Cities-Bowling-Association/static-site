# CSV Import Guide

## Overview

All detailed honor data (Hall of Fame, Bowler of the Year, High Average, etc.) should be imported via CSV files using the Admin panel at `/admin`.

## How to Import

1. Navigate to `/admin`
2. Click "Import from CSV"
3. Select your CSV file
4. Choose or confirm the collection type (honors, tournaments, centers, news)
5. Review the preview
6. Click "Commit to GitHub"

## CSV Formats by Honor Type

### Hall of Fame
**Filename:** `hall-of-fame.csv` or `YYYY-hall-of-fame.csv`

```csv
Year,Name
2025,Randy Southworth
2025,Ken Kempf
2024,Becky Landgraf
```

### Bowler of the Year
**Filename:** `bowler-of-the-year.csv`

```csv
Year,Men,Women,Boys,Girls
2025,Nick Hietpas,Beth Kosiorek,Kameron Harder,Audry Dehlinger
2024,Randy Southworth,Traci Brown,Tyler Brown,Miley Young
```

### High Average
**Filename:** `high-average.csv` or `YYYY-high-average.csv`

```csv
Year,Name,Games,Average,Category
2023,Nick Hietpas,69,248,Men
2023,Rachel Schmal,90,228,Women
2022,Nick Hietpas,90,244,Men
```

### High Series
**Filename:** `high-series.csv`

```csv
Score,Name,Date
878,Kyle Blaese,2/22/2005
877,Brian Krieglstein,10/28/2004
869,Jeff Nimke,10/15/2018
```

### 300 Games
**Filename:** `300-games-YYYY.csv` (year required)

```csv
Name,Achievement,Score,Date
John Smith,Perfect Game,300,2025-11-15
Sarah Johnson,Perfect Game,300,2025-10-22
```

### All Association Teams
**Filename:** `all-association-teams-YYYY.csv`

```csv
Team,Position,Name
1st Team Men,1,Randy Southworth
1st Team Men,2,Alex Leeman
2nd Team Men,1,Rick Green
```

## Important Notes

1. **Filename Convention:** The filename determines the category. Use kebab-case (hyphens).
   - `hall-of-fame.csv` → category: "hall-of-fame"
   - `300-games-2025.csv` → category: "300-games", year: 2025

2. **Headers:** First row must be column headers (Year, Name, Score, etc.)

3. **Required Columns:** Vary by type, but typically:
   - Hall of Fame: Year, Name
   - Bowler of Year: Year, Men, Women, Boys, Girls
   - High scores: Name, Score (or Average), Date

4. **Case Insensitive:** Column names can be "Name", "name", or "NAME"

5. **Multiple Files:** You can import multiple CSVs at once for different categories

6. **Overwrites:** Importing a file with the same category will update existing data

## After Import

The imported data will be saved as JSON files in `src/content/honors/` and automatically available at:
- `/honors/hall-of-fame`
- `/honors/bowler-of-the-year`
- `/honors/high-average`
- etc.

The dynamic route at `src/pages/honors/[category].astro` will automatically render any honor category that has data.
