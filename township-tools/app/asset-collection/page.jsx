"use client";

import { useState } from 'react';
import { Building2, ArrowLeft, ArrowRight, Loader2, CheckCircle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import ProgressIndicator from './components/ProgressIndicator';
import CoverSection from './components/CoverSection';
import OpeningLetterSection from './components/OpeningLetterSection';
import FooterSection from './components/FooterSection';
import ContentSectionsManager from './components/ContentSectionsManager';
import ReviewSection from './components/ReviewSection';
import { useFormPersistence } from './hooks/useFormPersistence';

const initialFormData = {
  cover: {
    logo: null,
    organizationName: '',
    reportName: '',
    tagline: '',
  },
  letter: {
    includeOpeningLetter: false,
    headshot: null,
    letterTitle: '',
    letterSubtitle: '',
    letterContent: '',
    letterImage1: null,
    letterImage1Caption: '',
    letterImage2: null,
    letterImage2Caption: '',
  },
  footer: {
    department: '',
    streetAddress: '',
    cityStateZip: '',
    phone: '',
    email: '',
    website: '',
  },
  sections: [{ title: '', content: '', images: [], stats: [], chartLink: '', imageCaptions: '', designNotes: '' }],
  review: {
    submitterName: '',
    submitterEmail: '',
    additionalNotes: '',
    confirmed: false,
  },
  currentStep: 1,
};

export default function AssetCollectionPage() {
  const { data: formData, setData: setFormData, isLoaded, clearDraft } = useFormPersistence(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [tipsExpanded, setTipsExpanded] = useState(true);

  const currentStep = formData.currentStep || 1;

  const updateFormData = (section, data) => {
    setFormData(prev => ({
      ...prev,
      [section]: data,
    }));
  };

  const goToStep = (step) => {
    setFormData(prev => ({ ...prev, currentStep: step }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep = (step) => {
    setError('');
    switch (step) {
      case 1: // Cover
        if (!formData.cover.organizationName?.trim()) {
          setError('Please enter your organization name');
          return false;
        }
        if (!formData.cover.reportName?.trim()) {
          setError('Please enter the report name');
          return false;
        }
        return true;

      case 2: // Letter (optional, but validate if enabled)
        if (formData.letter.includeOpeningLetter) {
          if (!formData.letter.letterTitle?.trim()) {
            setError('Please enter a title for the opening letter');
            return false;
          }
          if (!formData.letter.letterContent?.trim()) {
            setError('Please enter the letter content');
            return false;
          }
        }
        return true;

      case 3: // Footer
        if (!formData.footer.streetAddress?.trim()) {
          setError('Please enter the street address');
          return false;
        }
        if (!formData.footer.cityStateZip?.trim()) {
          setError('Please enter the city, state, and ZIP');
          return false;
        }
        if (!formData.footer.phone?.trim()) {
          setError('Please enter a phone number');
          return false;
        }
        if (!formData.footer.email?.trim()) {
          setError('Please enter an email address');
          return false;
        }
        return true;

      case 4: // Content sections
        if (formData.sections.length === 0) {
          setError('Please add at least one content section');
          return false;
        }
        for (let i = 0; i < formData.sections.length; i++) {
          if (!formData.sections[i].title?.trim()) {
            setError(`Please enter a title for Section ${i + 1}`);
            return false;
          }
        }
        return true;

      case 5: // Review
        if (!formData.review.submitterName?.trim()) {
          setError('Please enter your name');
          return false;
        }
        if (!formData.review.submitterEmail?.trim()) {
          setError('Please enter your email');
          return false;
        }
        if (!formData.review.confirmed) {
          setError('Please confirm that the information is accurate');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    goToStep(currentStep - 1);
  };

  const uploadFile = async (fileData, path) => {
    if (!fileData?.file) return null;

    const formDataUpload = new FormData();
    formDataUpload.append('file', fileData.file);
    formDataUpload.append('path', path);

    const response = await fetch('/api/asset-collection/upload', {
      method: 'POST',
      body: formDataUpload,
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    const result = await response.json();
    return result.url;
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setSubmitting(true);
    setError('');

    try {
      // First, create the submission to get an ID
      const createResponse = await fetch('/api/asset-collection/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'create',
          cover: {
            organizationName: formData.cover.organizationName,
            reportName: formData.cover.reportName,
            tagline: formData.cover.tagline,
          },
          letter: {
            includeOpeningLetter: formData.letter.includeOpeningLetter,
            letterTitle: formData.letter.letterTitle,
            letterSubtitle: formData.letter.letterSubtitle,
            letterContent: formData.letter.letterContent,
            letterImage1Caption: formData.letter.letterImage1Caption,
            letterImage2Caption: formData.letter.letterImage2Caption,
          },
          footer: formData.footer,
          review: formData.review,
        }),
      });

      if (!createResponse.ok) {
        const err = await createResponse.json();
        throw new Error(err.error || 'Failed to create submission');
      }

      const { submissionId: newSubmissionId } = await createResponse.json();

      // Upload files
      const logoUrl = await uploadFile(formData.cover.logo, `${newSubmissionId}/logo`);
      const headshotUrl = await uploadFile(formData.letter.headshot, `${newSubmissionId}/headshot`);
      const letterImage1Url = await uploadFile(formData.letter.letterImage1, `${newSubmissionId}/letter-image-1`);
      const letterImage2Url = await uploadFile(formData.letter.letterImage2, `${newSubmissionId}/letter-image-2`);

      // Upload section images and prepare section data
      const sectionsData = [];
      for (let i = 0; i < formData.sections.length; i++) {
        const section = formData.sections[i];
        const imageUrls = [];

        if (section.images?.length > 0) {
          for (let j = 0; j < section.images.length; j++) {
            const url = await uploadFile(section.images[j], `${newSubmissionId}/sections/${i}/image-${j}`);
            if (url) imageUrls.push(url);
          }
        }

        sectionsData.push({
          order: i,
          title: section.title,
          content: section.content,
          chartLink: section.chartLink,
          imageUrls,
          imageCaptions: section.imageCaptions?.split('\n').filter(c => c.trim()) || [],
          stats: section.stats?.filter(s => s.label && s.value) || [],
        });
      }

      // Finalize submission with all URLs
      const finalizeResponse = await fetch('/api/asset-collection/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'finalize',
          submissionId: newSubmissionId,
          logoUrl,
          headshotUrl,
          letterImage1Url,
          letterImage2Url,
          sections: sectionsData,
        }),
      });

      if (!finalizeResponse.ok) {
        const err = await finalizeResponse.json();
        throw new Error(err.error || 'Failed to finalize submission');
      }

      // Success!
      clearDraft();
      setSubmissionId(newSubmissionId);
      setSubmitted(true);

    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'An error occurred while submitting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-[#1e3a5f] text-white py-4">
          <div className="max-w-3xl mx-auto px-4 flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            <span className="text-xl font-bold">Township Tools</span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Submission Received!
            </h1>
            <p className="text-slate-600 mb-6">
              Thank you for submitting your report assets. We've received everything and will begin working on your report.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-500">Reference Number</p>
              <p className="font-mono text-lg text-slate-800">{submissionId}</p>
            </div>
            <p className="text-sm text-slate-500">
              We'll review your submission and reach out if we have any questions.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          <span className="text-xl font-bold">Township Tools</span>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <ProgressIndicator
            currentStep={currentStep}
            onStepClick={goToStep}
            completedSteps={completedSteps}
          />
        </div>
      </div>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Getting Started Tips */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setTipsExpanded(!tipsExpanded)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-amber-100/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="font-semibold text-amber-900">Before You Begin</span>
            </div>
            {tipsExpanded ? (
              <ChevronUp className="w-5 h-5 text-amber-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-amber-600" />
            )}
          </button>
          {tipsExpanded && (
            <div className="px-6 pb-5 space-y-3 text-sm text-amber-900">
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 mt-0.5 flex-shrink-0">1.</span>
                <p><strong>Start with text, add images last.</strong> Text content is auto-saved so you can leave and pick up where you left off. Images are <strong className="underline">not</strong> saved until you submit — if you close the page, you'll need to re-upload them.</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 mt-0.5 flex-shrink-0">2.</span>
                <p><strong>Have your images ready.</strong> Gather logos, headshots, and section photos before your final session. Accepted formats: JPG, PNG, or WebP (max 10 MB each).</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-amber-600 mt-0.5 flex-shrink-0">3.</span>
                <p><strong>Need an image collage?</strong> If you'd like multiple photos combined into one collage for a section, send the images directly to Jen Tran at jentran@my-trs.com — collages are custom-made and can't be built through this form.</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {currentStep === 1 && (
            <CoverSection
              data={formData.cover}
              onChange={(data) => updateFormData('cover', data)}
            />
          )}

          {currentStep === 2 && (
            <OpeningLetterSection
              data={formData.letter}
              onChange={(data) => updateFormData('letter', data)}
            />
          )}

          {currentStep === 3 && (
            <FooterSection
              data={formData.footer}
              onChange={(data) => updateFormData('footer', data)}
            />
          )}

          {currentStep === 4 && (
            <ContentSectionsManager
              sections={formData.sections}
              onChange={(sections) => updateFormData('sections', sections)}
            />
          )}

          {currentStep === 5 && (
            <ReviewSection
              formData={formData}
              reviewData={formData.review}
              onChange={(data) => updateFormData('review', data)}
              onUpdateCover={(data) => updateFormData('cover', data)}
            />
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d4a6f] transition-colors"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Draft indicator */}
        <p className="text-center text-sm text-slate-400 mt-4">
          Text content is automatically saved. Images are saved on submit.
        </p>
      </main>
    </div>
  );
}
