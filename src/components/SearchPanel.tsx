// Sequence search panel with debounced input and result navigation.

import { useCallback, useEffect, useRef, useState } from "react";
import { useGenomeStore } from "../store";

export function SearchPanel() {
  const searchQuery = useGenomeStore((s) => s.searchQuery);
  const searchMismatch = useGenomeStore((s) => s.searchMismatch);
  const searchResults = useGenomeStore((s) => s.searchResults);
  const searchCurrentIndex = useGenomeStore((s) => s.searchCurrentIndex);
  const setSearchQuery = useGenomeStore((s) => s.setSearchQuery);
  const setSearchMismatch = useGenomeStore((s) => s.setSearchMismatch);
  const nextSearchResult = useGenomeStore((s) => s.nextSearchResult);
  const prevSearchResult = useGenomeStore((s) => s.prevSearchResult);
  const clearSearch = useGenomeStore((s) => s.clearSearch);

  const [inputValue, setInputValue] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync input value when store query changes externally (e.g., clearSearch).
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 300);
    },
    [setSearchQuery],
  );

  // Cleanup debounce on unmount.
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handleMismatchChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSearchMismatch(Number(e.target.value));
    },
    [setSearchMismatch],
  );

  const handleClear = useCallback(() => {
    clearSearch();
    inputRef.current?.focus();
  }, [clearSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          prevSearchResult();
        } else {
          nextSearchResult();
        }
      }
      if (e.key === "Escape") {
        handleClear();
      }
    },
    [nextSearchResult, prevSearchResult, handleClear],
  );

  const matchCount = searchResults.length;
  const hasResults = matchCount > 0;

  return (
    <search className="search-panel" onKeyDown={handleKeyDown}>
      <h3>Search</h3>
      <div className="search-input-row">
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search sequence (e.g., GAATTC)..."
          value={inputValue}
          onChange={handleInputChange}
          spellCheck={false}
          autoComplete="off"
        />
        {inputValue && (
          <button type="button" className="search-clear-btn" onClick={handleClear} title="Clear">
            {"\u2715"}
          </button>
        )}
      </div>
      <div className="search-mismatch">
        <label htmlFor="search-mismatch-select">Mismatch:</label>
        <select id="search-mismatch-select" value={searchMismatch} onChange={handleMismatchChange}>
          <option value={0}>0</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>
      {searchQuery && (
        <div className="search-nav">
          <span className="search-match-count">
            {hasResults ? `${searchCurrentIndex + 1} of ${matchCount}` : "No matches"}
          </span>
          <button
            type="button"
            onClick={prevSearchResult}
            disabled={!hasResults}
            title="Previous (Shift+Enter)"
          >
            {"\u25B2"}
          </button>
          <button
            type="button"
            onClick={nextSearchResult}
            disabled={!hasResults}
            title="Next (Enter)"
          >
            {"\u25BC"}
          </button>
        </div>
      )}
    </search>
  );
}
