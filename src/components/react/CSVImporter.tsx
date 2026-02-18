import { useState } from "react";
import Papa from "papaparse";

interface CSVRow {
  [key: string]: string;
}

interface ImporterProps {
  onDataParsed: (data: any[], filename: string) => void;
  collectionType: "honors" | "tournaments" | "centers" | "news";
}

export default function CSVImporter({
  onDataParsed,
  collectionType,
}: ImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    setParsing(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        if (results.errors.length > 0) {
          setError(
            `CSV parsing error: ${results.errors[0]?.message || "Unknown error"}`,
          );
          return;
        }
        onDataParsed(results.data as CSVRow[], file.name);
      },
      error: (error) => {
        setParsing(false);
        setError(`Error reading file: ${error.message}`);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-4 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-text/20 bg-background hover:border-text/30"
        }`}
      >
        {parsing ? (
          <div className="text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">Parsing CSV file...</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-16 w-16 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <label className="cursor-pointer">
              <span className="mt-2 block text-lg font-semibold text-text">
                Drop CSV file here or click to browse
              </span>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileInput}
              />
            </label>
            <p className="mt-2 text-sm text-text-secondary">
              Upload your {collectionType} data as a CSV file
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-700 font-medium">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}
