import { useCallback, useRef } from "react";

interface FileLoaderProps {
  onFileLoad: (content: string, fileName: string) => void;
  isLoading: boolean;
}

export function FileLoader({ onFileLoad, isLoading }: FileLoaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === "string") {
          onFileLoad(content, file.name);
        }
      };
      reader.readAsText(file);
    },
    [onFileLoad],
  );

  return (
    <div className="file-loader">
      <button type="button" onClick={() => inputRef.current?.click()} disabled={isLoading}>
        {isLoading ? "Parsing..." : "Load GenBank/FASTA File"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".gb,.gbk,.genbank,.fasta,.fa,.fna,.seq,.ape"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
