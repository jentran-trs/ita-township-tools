"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'asset-collection-form-draft';

function buildSavePayload(data) {
  return {
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
}

export function useFormPersistence(initialData) {
  const [data, setData] = useState(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const dataRef = useRef(data);
  dataRef.current = data;

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
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
            images: [],
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
        const toSave = buildSavePayload(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        setSaveError('');
      } catch (e) {
        console.error('Error saving form draft:', e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          setSaveError('Auto-save failed: browser storage is full. Your progress may not be saved if you leave this page.');
        } else {
          setSaveError('Auto-save failed. Your progress may not be saved if you leave this page.');
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [data, isLoaded]);

  // Force an immediate save (call before submit so latest data is persisted)
  const saveNow = useCallback(() => {
    try {
      const toSave = buildSavePayload(dataRef.current);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setSaveError('');
    } catch (e) {
      console.error('Error saving form draft:', e);
    }
  }, []);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return { data, setData, isLoaded, clearDraft, saveNow, saveError };
}
