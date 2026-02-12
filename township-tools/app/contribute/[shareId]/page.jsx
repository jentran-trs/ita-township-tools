"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Building2, Loader2, AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Save, LogIn, Lightbulb, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';

// Import the form components from asset-collection
import ProgressIndicator from '../../asset-collection/components/ProgressIndicator';
import CoverSection from '../../asset-collection/components/CoverSection';
import OpeningLetterSection from '../../asset-collection/components/OpeningLetterSection';
import FooterSection from '../../asset-collection/components/FooterSection';
import ContentSectionsManager from '../../asset-collection/components/ContentSectionsManager';
import ReviewSection from '../../asset-collection/components/ReviewSection';
import FormTransferBar from '../../asset-collection/components/FormTransferBar';

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
  sections: [{ title: '', images: [], textBlocks: [], contentCards: [], stats: [], designNotes: '' }],
  review: {
    submitterName: '',
    submitterEmail: '',
    additionalNotes: '',
    confirmed: false,
  },
  currentStep: 1,
};

export default function ContributePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [formError, setFormError] = useState('');

  // Edit mode state
  const editSubmissionId = searchParams.get('edit');
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [existingImageUrls, setExistingImageUrls] = useState({});
  const [hasLoadedSubmission, setHasLoadedSubmission] = useState(false); // Prevent double-loading

  // Draft persistence state
  const [session, setSession] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [tipsExpanded, setTipsExpanded] = useState(true);

  const currentStep = formData.currentStep || 1;
  const isLoggedIn = isUserLoaded && !!user;

  // Fetch project details
  useEffect(() => {
    fetchProject();
  }, [params.shareId]);

  // Load existing submission for edit mode, or load server draft
  // Only load once to prevent overwriting user's changes
  useEffect(() => {
    if (!loading && project && isLoggedIn && !hasLoadedSubmission) {
      if (editSubmissionId) {
        loadExistingSubmission(editSubmissionId);
        setHasLoadedSubmission(true);
      } else {
        loadServerDraft();
        setHasLoadedSubmission(true);
      }
    }
  }, [loading, project, isLoggedIn, editSubmissionId, hasLoadedSubmission]);

  // Auto-save for logged-in users (server-side) - skip in edit mode
  useEffect(() => {
    if (!loading && project && isLoggedIn && !submitted && !isEditMode) {
      const timer = setTimeout(() => {
        saveServerDraft();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, loading, project, isLoggedIn, submitted, isEditMode]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/share/${params.shareId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);

        // Pre-fill organization name
        setFormData(prev => ({
          ...prev,
          cover: {
            ...prev.cover,
            organizationName: prev.cover.organizationName || data.project.organization_name,
            reportName: prev.cover.reportName || data.project.name,
          },
        }));
      } else {
        setError('Project not found or not accepting submissions');
      }
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadServerDraft = async () => {
    try {
      const response = await fetch(`/api/contribute/draft?shareId=${params.shareId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          setSession(data.session);

          // If already submitted, show success
          if (data.session.status === 'submitted' && data.session.submissionId) {
            setSubmitted(true);
            setSubmissionId(data.session.submissionId);
            return;
          }
        }

        if (data.draftData && Object.keys(data.draftData).length > 0) {
          applyDraftData(data.draftData);
          setLastSaved(new Date());
        }
      }
    } catch (err) {
      console.error('Error loading server draft:', err);
    }
  };

  const loadExistingSubmission = async (subId) => {
    setLoadingSubmission(true);
    try {
      const response = await fetch(`/api/submissions/${subId}`);
      if (response.ok) {
        const data = await response.json();
        const sub = data.submission;

        // Store existing image URLs for display
        setExistingImageUrls({
          logo: sub.logo_url,
          headshot: sub.letter_headshot_url,
          letterImage1: sub.letter_image1_url,
          letterImage2: sub.letter_image2_url,
        });

        // Parse content to extract text blocks and content cards
        const parseContent = (content) => {
          if (!content) return { textBlocks: [], contentCards: [] };

          const textBlocks = [];
          const contentCards = [];

          // Split by [CARD] tags
          const parts = content.split(/\[CARD\]/);

          // First part (before any [CARD]) is text content
          if (parts[0] && parts[0].trim()) {
            textBlocks.push(parts[0].trim());
          }

          // Process remaining parts that contain cards
          for (let i = 1; i < parts.length; i++) {
            const cardMatch = parts[i].split(/\[\/CARD\]/);
            if (cardMatch[0]) {
              const cardContent = cardMatch[0].trim();
              const lines = cardContent.split('\n');
              const title = lines[0] || '';
              const body = lines.slice(1).join('\n').trim();
              contentCards.push({ title, body });
            }
            // Text after [/CARD] goes to text blocks
            if (cardMatch[1] && cardMatch[1].trim()) {
              textBlocks.push(cardMatch[1].trim());
            }
          }

          return { textBlocks, contentCards };
        };

        // Debug: Log raw section data from API
        console.log('=== LOADING EXISTING SUBMISSION ===');
        console.log('Sections count from API:', sub.report_sections?.length);
        sub.report_sections?.forEach((s, idx) => {
          console.log(`Section ${idx}: ${s.title}`);
          console.log(`  - image_urls:`, s.image_urls);
          console.log(`  - image_urls length:`, s.image_urls?.length || 0);
        });

        // Transform sections with proper content parsing
        const transformedSections = (sub.report_sections || []).map(section => {
          const { textBlocks, contentCards } = parseContent(section.content);

          // Build images array from regular images
          const images = (section.image_urls || []).map((url, idx) => ({
            file: null,
            caption: section.image_captions?.[idx] || '',
            existingUrl: url, // Store existing URL
            isChart: false,
          }));

          // Add existing chart to images array if present
          if (section.chart_link) {
            images.push({
              file: null,
              caption: section.chart_caption || '',
              existingUrl: section.chart_link,
              isChart: true,
            });
          }

          return {
            title: section.title || '',
            images,
            textBlocks,
            contentCards,
            stats: (section.report_section_stats || []).map(stat => ({
              label: stat.label || '',
              value: stat.value || '',
            })),
            designNotes: section.design_notes || '',
            chartLink: section.chart_link || '',
            chartCaption: section.chart_caption || '',
          };
        });

        // Debug: Log transformed sections
        console.log('=== TRANSFORMED SECTIONS ===');
        transformedSections.forEach((s, idx) => {
          console.log(`Transformed Section ${idx}: ${s.title}`);
          console.log(`  - images count:`, s.images?.length || 0);
          console.log(`  - images:`, s.images?.map(img => ({
            hasFile: !!img.file,
            existingUrl: img.existingUrl?.substring(0, 50) + '...',
            caption: img.caption,
          })));
        });

        // Ensure at least one section exists
        const finalSections = transformedSections.length > 0
          ? transformedSections
          : [{ title: '', images: [], textBlocks: [], contentCards: [], stats: [], designNotes: '' }];

        // Transform submission data to form data format
        setFormData({
          cover: {
            logo: null, // Will show existing URL separately
            organizationName: sub.organization_name || '',
            reportName: sub.report_name || '',
            tagline: sub.tagline || '',
          },
          letter: {
            includeOpeningLetter: sub.include_opening_letter || false,
            headshot: null,
            letterTitle: sub.letter_title || '',
            letterSubtitle: sub.letter_subtitle || '',
            letterContent: sub.letter_content || '',
            letterImage1: null,
            letterImage1Caption: sub.letter_image1_caption || '',
            letterImage2: null,
            letterImage2Caption: sub.letter_image2_caption || '',
          },
          footer: {
            department: sub.department || '',
            streetAddress: sub.street_address || '',
            cityStateZip: sub.city_state_zip || '',
            phone: sub.phone || '',
            email: sub.email || '',
            website: sub.website || '',
          },
          sections: finalSections,
          review: {
            submitterName: sub.submitter_name || '',
            submitterEmail: sub.submitter_email || '',
            additionalNotes: sub.additional_notes || '',
            confirmed: false,
          },
          currentStep: 1,
        });

        setIsEditMode(true);
        setSubmissionId(subId);
        setCompletedSteps([1, 2, 3, 4]); // Mark previous steps as complete
      } else {
        setError('Could not load submission for editing');
      }
    } catch (err) {
      console.error('Error loading submission:', err);
      setError('Failed to load submission');
    } finally {
      setLoadingSubmission(false);
    }
  };

  const applyDraftData = (draftData) => {
    setFormData(prev => ({
      ...prev,
      cover: { ...prev.cover, ...draftData.cover, logo: null },
      letter: { ...prev.letter, ...draftData.letter, headshot: null, letterImage1: null, letterImage2: null },
      footer: { ...prev.footer, ...draftData.footer },
      sections: (draftData.sections || []).map(s => ({
        ...s,
        images: (s.images || []).map(img => ({ ...img, file: null })),
        textBlocks: s.textBlocks || [],
        contentCards: s.contentCards || [],
        stats: s.stats || [],
        designNotes: s.designNotes || '',
      })),
      review: { ...prev.review, ...draftData.review },
      currentStep: draftData.currentStep || 1,
    }));
  };

  const getDraftDataForSave = useCallback(() => {
    return {
      cover: { ...formData.cover, logo: null },
      letter: { ...formData.letter, headshot: null, letterImage1: null, letterImage2: null },
      footer: formData.footer,
      sections: formData.sections.map(s => ({
        ...s,
        images: (s.images || []).map(img => ({ caption: img.caption, file: null })),
        textBlocks: s.textBlocks || [],
        contentCards: s.contentCards || [],
        stats: s.stats || [],
        designNotes: s.designNotes || '',
      })),
      review: formData.review,
      currentStep: formData.currentStep,
    };
  }, [formData]);

  const saveServerDraft = async () => {
    if (savingDraft) return;

    setSavingDraft(true);
    try {
      const draftData = getDraftDataForSave();
      const response = await fetch('/api/contribute/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareId: params.shareId,
          sessionId: session?.id,
          draftData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sessionId && !session) {
          setSession({ id: data.sessionId });
        }
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error('Error saving server draft:', err);
    } finally {
      setSavingDraft(false);
    }
  };

  const updateFormData = (section, data) => {
    setFormData(prev => ({ ...prev, [section]: data }));
  };

  const goToStep = (step) => {
    setFormData(prev => ({ ...prev, currentStep: step }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep = (step) => {
    setFormError('');
    switch (step) {
      case 1:
        if (!formData.cover.organizationName?.trim()) {
          setFormError('Please enter your organization name');
          return false;
        }
        if (!formData.cover.reportName?.trim()) {
          setFormError('Please enter the report name');
          return false;
        }
        return true;
      case 2:
        if (formData.letter.includeOpeningLetter) {
          if (!formData.letter.letterTitle?.trim()) {
            setFormError('Please enter a title for the opening letter');
            return false;
          }
          if (!formData.letter.letterContent?.trim()) {
            setFormError('Please enter the letter content');
            return false;
          }
        }
        return true;
      case 3:
        if (!formData.footer.streetAddress?.trim()) {
          setFormError('Please enter the street address');
          return false;
        }
        if (!formData.footer.cityStateZip?.trim()) {
          setFormError('Please enter the city, state, and ZIP');
          return false;
        }
        if (!formData.footer.phone?.trim()) {
          setFormError('Please enter a phone number');
          return false;
        }
        if (!formData.footer.email?.trim()) {
          setFormError('Please enter an email address');
          return false;
        }
        return true;
      case 4:
        if (formData.sections.length === 0) {
          setFormError('Please add at least one content section');
          return false;
        }
        for (let i = 0; i < formData.sections.length; i++) {
          if (!formData.sections[i].title?.trim()) {
            setFormError(`Please enter a title for Section ${i + 1}`);
            return false;
          }
        }
        return true;
      case 5:
        // Logo is required - either new upload or existing (in edit mode)
        const hasLogo = formData.cover.logo?.file || (isEditMode && existingImageUrls.logo);
        if (!hasLogo) {
          setFormError('Please upload your organization logo');
          return false;
        }
        if (!formData.review.submitterName?.trim()) {
          setFormError('Please enter your name');
          return false;
        }
        if (!formData.review.submitterEmail?.trim()) {
          setFormError('Please enter your email');
          return false;
        }
        if (!formData.review.confirmed) {
          setFormError('Please confirm that the information is accurate');
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

  const handleImport = (importedData) => {
    // Preserve project's pre-filled org/report names if the imported data is empty
    if (!importedData.cover.organizationName && project?.organization_name) {
      importedData.cover.organizationName = project.organization_name;
    }
    if (!importedData.cover.reportName && project?.name) {
      importedData.cover.reportName = project.name;
    }
    setFormData(importedData);
    setCompletedSteps([]);
    setFormError('');
  };

  const uploadFile = async (fileData, path, oldUrl = null) => {
    if (!fileData?.file) return null;
    const formDataUpload = new FormData();
    formDataUpload.append('file', fileData.file);
    formDataUpload.append('path', path);
    // Pass old URL so server can delete the old file
    if (oldUrl) {
      formDataUpload.append('oldUrl', oldUrl);
    }
    const response = await fetch('/api/asset-collection/upload', {
      method: 'POST',
      body: formDataUpload,
    });
    if (!response.ok) throw new Error('File upload failed');
    const result = await response.json();
    return result.url;
  };

  const handleSubmit = async () => {
    // Debug: Log current form state at moment of submit
    console.log('=== SUBMIT CLICKED ===');
    console.log('formData.sections at submit:', formData.sections.map((s, i) => ({
      index: i,
      title: s.title,
      imagesCount: s.images?.length,
      images: s.images?.map(img => ({
        hasFile: !!img.file,
        hasFileFile: !!img.file?.file,
        hasExistingUrl: !!img.existingUrl,
      })),
      statsCount: s.stats?.length,
      contentCardsCount: s.contentCards?.length,
    })));

    if (!validateStep(5)) return;

    // Force a server draft save so progress is safe if submission fails
    if (!isEditMode) {
      saveServerDraft();
    }

    setSubmitting(true);
    setFormError('');

    try {
      let finalSubmissionId = isEditMode ? submissionId : null;

      if (isEditMode) {
        // Update existing submission
        const updatePayload = {
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
        };
        console.log('Sending PUT update with letter data:', {
          letterSubtitle: updatePayload.letter.letterSubtitle,
          letterTitle: updatePayload.letter.letterTitle,
        });

        const updateResponse = await fetch(`/api/submissions/${submissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        const updateResult = await updateResponse.json();
        console.log('PUT update response:', updateResult);

        if (!updateResponse.ok) {
          throw new Error(updateResult.error || 'Failed to update submission');
        }
      } else {
        // Create new submission
        const createResponse = await fetch('/api/asset-collection/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: 'create',
            projectId: project.id,
            contributorSessionId: session?.id,
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
        setSubmissionId(newSubmissionId);
        finalSubmissionId = newSubmissionId;
      }

      // Upload new files (only if user selected new files)
      // Use timestamp in filename to avoid CDN cache issues when replacing
      // Pass old URL so server can delete the old file
      const uploadTimestamp = Date.now();
      const logoUrl = formData.cover.logo?.file
        ? await uploadFile(formData.cover.logo, `${finalSubmissionId}/logo-${uploadTimestamp}`, existingImageUrls.logo)
        : (isEditMode ? existingImageUrls.logo : null);
      const headshotUrl = formData.letter.headshot?.file
        ? await uploadFile(formData.letter.headshot, `${finalSubmissionId}/headshot-${uploadTimestamp}`, existingImageUrls.headshot)
        : (isEditMode ? existingImageUrls.headshot : null);
      const letterImage1Url = formData.letter.letterImage1?.file
        ? await uploadFile(formData.letter.letterImage1, `${finalSubmissionId}/letter-image-1-${uploadTimestamp}`, existingImageUrls.letterImage1)
        : (isEditMode ? existingImageUrls.letterImage1 : null);
      const letterImage2Url = formData.letter.letterImage2?.file
        ? await uploadFile(formData.letter.letterImage2, `${finalSubmissionId}/letter-image-2-${uploadTimestamp}`, existingImageUrls.letterImage2)
        : (isEditMode ? existingImageUrls.letterImage2 : null);

      // Upload section images and build section data
      const sectionsData = [];
      console.log('Building sections data, section count:', formData.sections.length);
      for (let i = 0; i < formData.sections.length; i++) {
        const section = formData.sections[i];
        console.log(`Section ${i}:`, { title: section.title, imageCount: section.images?.length, textBlocks: section.textBlocks?.length, contentCards: section.contentCards?.length });

        // Upload images with individual captions - separate charts from regular images
        const imagesWithCaptions = [];
        let chartUrl = section.chartLink || ''; // Start with existing chartLink if any
        let chartCaption = section.chartCaption || ''; // Track chart caption

        if (section.images?.length > 0) {
          for (let j = 0; j < section.images.length; j++) {
            const img = section.images[j];
            const isChart = img.isChart || false;

            // Debug: show full image structure
            console.log(`Image ${i}-${j} structure:`, {
              hasFile: !!img.file,
              isChart,
              hasExistingUrl: !!img.existingUrl,
            });

            if (img.file?.file) {
              // New file uploaded - use timestamp in filename to avoid CDN cache
              const timestamp = Date.now();
              const oldUrl = img.existingUrl || null;
              const fileType = isChart ? 'chart' : 'image';
              const url = await uploadFile(img.file, `${finalSubmissionId}/sections/${i}/${fileType}-${j}-${timestamp}`, oldUrl);
              console.log(`Uploaded new ${fileType} ${i}-${j}:`, url);

              if (url) {
                if (isChart) {
                  // Store chart URL and caption separately
                  chartUrl = url;
                  chartCaption = img.caption || '';
                } else {
                  imagesWithCaptions.push({ url, caption: img.caption || '' });
                }
              }
            } else if (img.existingUrl) {
              // Keep existing image/chart
              console.log(`Keeping existing ${isChart ? 'chart' : 'image'} ${i}-${j}:`, img.existingUrl);
              if (isChart) {
                chartUrl = img.existingUrl;
                chartCaption = img.caption || '';
              } else {
                imagesWithCaptions.push({ url: img.existingUrl, caption: img.caption || '' });
              }
            }
          }
        }

        // Combine text blocks and content cards into content
        const contentParts = [];
        if (section.textBlocks?.length > 0) {
          contentParts.push(...section.textBlocks.filter(t => t.trim()));
        }
        const content = contentParts.join('\n\n');

        sectionsData.push({
          order: i,
          title: section.title,
          content: content,
          imageUrls: imagesWithCaptions.map(img => img.url),
          imageCaptions: imagesWithCaptions.map(img => img.caption),
          stats: section.stats?.filter(s => s.label && s.value) || [],
          contentCards: section.contentCards?.filter(c => c.title || c.body) || [],
          designNotes: section.designNotes || '',
          chartLink: chartUrl,
          chartCaption: chartCaption,
        });
      }

      // Finalize (works for both create and update)
      const requestBody = {
        phase: isEditMode ? 'update' : 'finalize',
        submissionId: finalSubmissionId,
        contributorSessionId: session?.id,
        logoUrl,
        headshotUrl,
        letterImage1Url,
        letterImage2Url,
        sections: sectionsData,
      };

      // Log the EXACT JSON being sent
      const jsonBody = JSON.stringify(requestBody);
      console.log('=== EXACT REQUEST BODY ===');
      console.log('sections count in requestBody:', requestBody.sections.length);
      console.log('sections titles:', requestBody.sections.map(s => s.title));
      console.log('JSON body length:', jsonBody.length);

      const finalizeResponse = await fetch('/api/asset-collection/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
      });

      const finalizeResult = await finalizeResponse.json();
      console.log('Finalize response:', finalizeResult);

      if (!finalizeResponse.ok) {
        throw new Error(finalizeResult.error || 'Failed to save submission');
      }

      setSubmitted(true);

    } catch (err) {
      console.error('Submission error:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setFormError('Network error — could not reach the server. Please check your internet connection and try again. Your text progress has been saved.');
      } else {
        setFormError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !isUserLoaded || loadingSubmission) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin mx-auto mb-2" />
          {loadingSubmission && <p className="text-slate-600">Loading your submission...</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Require login
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-[#1e3a5f] text-white py-4">
          <div className="max-w-3xl mx-auto px-4 flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            <span className="text-xl font-bold">Township Tools</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-8 h-8 text-[#1e3a5f]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Sign In Required</h1>
            <p className="text-slate-600 mb-2">
              To submit assets for <strong>{project.name}</strong>, please sign in with your account.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Your progress will be saved automatically so you can resume anytime.
            </p>
            <SignInButton mode="modal" redirectUrl={`/contribute/${params.shareId}`}>
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d4a6f] font-medium">
                <LogIn className="w-5 h-5" />
                Sign In to Continue
              </button>
            </SignInButton>
          </div>
        </main>
      </div>
    );
  }

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
              {isEditMode ? 'Changes Saved!' : 'Thank You!'}
            </h1>
            <p className="text-slate-600 mb-4">
              {isEditMode
                ? `Your changes to the submission for ${project.name} have been saved.`
                : `Your assets for ${project.name} have been submitted successfully.`
              }
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Reference: {submissionId}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d4a6f] transition-colors font-medium"
            >
              <Building2 className="w-5 h-5" />
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1e3a5f] text-white py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">Township Tools</span>
              {isEditMode && (
                <span className="px-2 py-0.5 bg-amber-500 text-slate-900 text-xs font-semibold rounded">
                  Editing
                </span>
              )}
            </div>
            <p className="text-sm text-blue-200">
              {isEditMode ? 'Editing submission for:' : 'Contributing to:'} {project.name}
            </p>
          </div>
          {lastSaved && !isEditMode && (
            <div className="flex items-center gap-1 text-xs text-blue-200">
              {savingDraft ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <ProgressIndicator
            currentStep={currentStep}
            onStepClick={goToStep}
            completedSteps={completedSteps}
          />
        </div>
      </div>

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

        <FormTransferBar
          formData={formData}
          onImport={handleImport}
          source="contribute"
          hideImport={isEditMode}
        />

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
              existingImageUrls={isEditMode ? {
                headshot: existingImageUrls.headshot,
                letterImage1: existingImageUrls.letterImage1,
                letterImage2: existingImageUrls.letterImage2,
              } : {}}
            />
          )}
          {currentStep === 3 && (
            <FooterSection data={formData.footer} onChange={(data) => updateFormData('footer', data)} />
          )}
          {currentStep === 4 && (
            <ContentSectionsManager sections={formData.sections} onChange={(sections) => updateFormData('sections', sections)} />
          )}
          {currentStep === 5 && (
            <ReviewSection
              formData={formData}
              reviewData={formData.review}
              onChange={(data) => updateFormData('review', data)}
              onUpdateCover={(data) => updateFormData('cover', data)}
              existingLogoUrl={isEditMode ? existingImageUrls.logo : null}
            />
          )}

          {formError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            {currentStep > 1 ? (
              <button type="button" onClick={prevStep} className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-800">
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
            ) : <div />}

            {currentStep < 5 ? (
              <button type="button" onClick={nextStep} className="flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d4a6f]">
                Next <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-sm text-slate-400 mt-4">
          Text content is automatically saved to your account. Images are saved on submit.
        </p>
      </main>
    </div>
  );
}
