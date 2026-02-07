"use client";

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'asset-collection-form-draft';

export function useFormPersistence(initialData) {
  const [data, setData] = useState(initialData);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Don't restore file objects (they can't be serialized)
        // But keep other form data
        setData(prev => ({
          ...prev,
          cover: { ...prev.cover, ...parsed.cover, logo: null },
          letter: {
            ...prev.letter,
            ...parsed.letter,
            headshot: null,
            letterImage1: null,
            letterImage2: null,
          },
          footer: { ...prev.footer, ...parsed.footer },
          sections: (parsed.sections || []).map(s => ({
            ...s,
            images: [], // Clear file objects
          })),
          review: { ...prev.review, ...parsed.review },
          currentStep: parsed.currentStep || 1,
        }));
      }
    } catch (e) {
      console.error('Error loading form draft:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change (debounced)
  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      try {
        // Don't save file objects
        const toSave = {
          cover: { ...data.cover, logo: null },
          letter: {
            ...data.letter,
            headshot: null,
            letterImage1: null,
            letterImage2: null,
          },
          footer: data.footer,
          sections: data.sections.map(s => ({
            ...s,
            images: [], // Don't save file objects
          })),
          review: data.review,
          currentStep: data.currentStep,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) {
        console.error('Error saving form draft:', e);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [data, isLoaded]);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return { data, setData, isLoaded, clearDraft };
}
