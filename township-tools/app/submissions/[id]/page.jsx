"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, useOrganization, useAuth } from '@clerk/nextjs';
import {
  ArrowLeft,
  FileText,
  Image,
  User,
  Calendar,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Building2,
  Hash,
  BarChart3,
  MessageSquare,
} from 'lucide-react';

export default function ViewSubmissionPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoaded } = useUser();
  const { membership } = useOrganization();
  const { orgRole } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded && params.id) {
      fetchSubmission();
    }
  }, [isLoaded, params.id]);

  const fetchSubmission = async () => {
    try {
      const response = await fetch(`/api/submissions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        // Debug: Log sections data
        console.log('ViewSubmission - sections data:',
          data.submission.report_sections?.map(s => ({
            id: s.id,
            title: s.title,
            image_urls: s.image_urls,
            image_urls_length: Array.isArray(s.image_urls) ? s.image_urls.length : 'not array',
          }))
        );
        // Verify user owns this submission or is admin
        const isAdmin = membership?.role === 'org:admin' || orgRole === 'org:admin';
        if (!isAdmin && data.submission.submitter_email !== user?.primaryEmailAddress?.emailAddress) {
          setError('You do not have permission to view this submission');
          return;
        }
        setSubmission(data.submission);
      } else {
        setError('Submission not found');
      }
    } catch (err) {
      console.error('Error fetching submission:', err);
      setError('Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Submission not found</p>
      </div>
    );
  }

  const sections = submission.report_sections || [];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/projects')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {submission.submitter_email !== user?.primaryEmailAddress?.emailAddress
                  ? `${submission.submitter_name}'s Submission`
                  : 'Your Submission'}
              </h1>
              <p className="text-sm text-slate-400">
                Submitted on {new Date(submission.created_at).toLocaleDateString()}
                {submission.submitter_email !== user?.primaryEmailAddress?.emailAddress && (
                  <span> by {submission.submitter_email}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Cover Section */}
        <section className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            Cover Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Organization Name</p>
              <p className="text-white font-medium">{submission.organization_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Report Name</p>
              <p className="text-white">{submission.report_name}</p>
            </div>
            {submission.tagline && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500 uppercase mb-1">Tagline</p>
                <p className="text-slate-300 italic">"{submission.tagline}"</p>
              </div>
            )}
          </div>
          {submission.logo_url && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Logo</p>
              <img src={submission.logo_url} alt="Logo" className="h-20 object-contain bg-white rounded-lg p-2" />
            </div>
          )}
        </section>

        {/* Opening Letter */}
        {submission.include_opening_letter && (
          <section className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Opening Letter
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase mb-1">Title</p>
                <p className="text-white font-medium">{submission.letter_title}</p>
              </div>
              {submission.letter_subtitle && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Subtitle</p>
                  <p className="text-slate-300">{submission.letter_subtitle}</p>
                </div>
              )}
              {submission.letter_content && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Content</p>
                  <p className="text-slate-300 whitespace-pre-wrap">{submission.letter_content}</p>
                </div>
              )}
              <div className="flex gap-4 mt-4">
                {submission.letter_headshot_url && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-2">Headshot</p>
                    <img src={submission.letter_headshot_url} alt="Headshot" className="w-24 h-24 object-cover rounded-lg" />
                  </div>
                )}
                {submission.letter_image1_url && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-2">Image 1</p>
                    <img src={submission.letter_image1_url} alt="Image 1" className="w-24 h-24 object-cover rounded-lg" />
                  </div>
                )}
                {submission.letter_image2_url && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-2">Image 2</p>
                    <img src={submission.letter_image2_url} alt="Image 2" className="w-24 h-24 object-cover rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Content Sections */}
        {sections.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Content Sections ({sections.length})
            </h2>
            {sections.map((section, idx) => (
              <div key={section.id} className="bg-slate-800 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">{section.title}</h3>

                {/* Stats */}
                {section.report_section_stats?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 uppercase mb-2 flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Statistics
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {section.report_section_stats.map((stat, statIdx) => (
                        <div key={statIdx} className="bg-slate-700 rounded-lg p-3">
                          <p className="text-2xl font-bold text-amber-500">{stat.value}</p>
                          <p className="text-sm text-slate-400">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content */}
                {section.content && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 uppercase mb-2">Content</p>
                    <p className="text-slate-300 whitespace-pre-wrap">{section.content}</p>
                  </div>
                )}

                {/* Design Notes */}
                {section.design_notes && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 uppercase mb-2">Design Notes</p>
                    <p className="text-slate-400 italic">{section.design_notes}</p>
                  </div>
                )}

                {/* Chart Link */}
                {section.chart_link && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 uppercase mb-2 flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      Chart/Embed
                    </p>
                    <a
                      href={section.chart_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm break-all"
                    >
                      {section.chart_link}
                    </a>
                  </div>
                )}

                {/* Images */}
                {section.image_urls?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase mb-2 flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      Images ({section.image_urls.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {section.image_urls.map((url, imgIdx) => (
                        <div key={imgIdx} className="relative">
                          <img src={url} alt={`Section image ${imgIdx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                          {section.image_captions?.[imgIdx] && (
                            <p className="text-xs text-slate-400 mt-1">{section.image_captions[imgIdx]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Footer/Contact Information */}
        <section className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-amber-500" />
            Contact Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              {submission.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">{submission.email}</span>
                </div>
              )}
              {submission.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">{submission.phone}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {submission.street_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-slate-300">{submission.street_address}</p>
                    {submission.city_state_zip && (
                      <p className="text-slate-300">{submission.city_state_zip}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Additional Notes */}
        {submission.additional_notes && (
          <section className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Additional Notes</h2>
            <p className="text-slate-300 whitespace-pre-wrap">{submission.additional_notes}</p>
          </section>
        )}
      </main>
    </div>
  );
}
