import { createServerSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phase } = body;

    // Log raw request data immediately
    console.log('=== RAW REQUEST RECEIVED ===');
    console.log('phase:', phase);
    console.log('sections array length:', body.sections?.length);
    console.log('sections titles:', body.sections?.map(s => s.title));

    // Get Clerk user ID if logged in
    const authData = await auth();
    const clerkUserId = authData?.userId || null;

    const supabase = createServerSupabaseClient();

    if (phase === 'create') {
      // Phase 1: Create the submission record
      const { projectId, contributorSessionId, cover, letter, footer, review } = body;

      const insertData = {
        // Link to project if provided
        project_id: projectId || null,
        // Link to contributor session if provided
        contributor_session_id: contributorSessionId || null,

        // Submitter info
        submitter_name: review.submitterName,
        submitter_email: review.submitterEmail,
        additional_notes: review.additionalNotes,

        // Cover
        organization_name: cover.organizationName,
        report_name: cover.reportName,
        tagline: cover.tagline,

        // Opening letter
        include_opening_letter: letter.includeOpeningLetter,
        letter_title: letter.letterTitle,
        letter_subtitle: letter.letterSubtitle,
        letter_content: letter.letterContent,
        letter_image1_caption: letter.letterImage1Caption,
        letter_image2_caption: letter.letterImage2Caption,

        // Footer
        department: footer.department,
        street_address: footer.streetAddress,
        city_state_zip: footer.cityStateZip,
        phone: footer.phone,
        email: footer.email,
        website: footer.website,
      };

      // Try to include clerk_user_id if the column exists
      if (clerkUserId) {
        insertData.clerk_user_id = clerkUserId;
      }

      let submission = null;
      let createError = null;

      const { data: data1, error: error1 } = await supabase
        .from('report_submissions')
        .insert(insertData)
        .select('id')
        .single();

      // If clerk_user_id column doesn't exist, retry without it
      // Check for both PostgreSQL error (42703) and PostgREST error (PGRST204)
      if ((error1?.code === '42703' || error1?.code === 'PGRST204') && insertData.clerk_user_id) {
        console.log('clerk_user_id column not found, inserting without it');
        delete insertData.clerk_user_id;
        const { data: data2, error: error2 } = await supabase
          .from('report_submissions')
          .insert(insertData)
          .select('id')
          .single();
        submission = data2;
        createError = error2;
      } else {
        submission = data1;
        createError = error1;
      }

      if (createError) {
        console.error('Create error:', createError);
        return NextResponse.json(
          { error: 'Failed to create submission', details: createError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        submissionId: submission.id,
      });

    } else if (phase === 'finalize') {
      // Phase 2: Update with file URLs and add sections
      const { submissionId, contributorSessionId, logoUrl, headshotUrl, letterImage1Url, letterImage2Url, sections } = body;

      // Update submission with file URLs
      const { error: updateError } = await supabase
        .from('report_submissions')
        .update({
          logo_url: logoUrl,
          letter_headshot_url: headshotUrl,
          letter_image1_url: letterImage1Url,
          letter_image2_url: letterImage2Url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update submission', details: updateError.message },
          { status: 500 }
        );
      }

      // Insert sections
      for (const section of sections) {
        // Combine content with content cards for storage
        let fullContent = section.content || '';
        if (section.contentCards && section.contentCards.length > 0) {
          const cardsText = section.contentCards
            .map(card => `[CARD]\n${(card.title || '').trim()}\n${(card.body || '').trim()}\n[/CARD]`)
            .join('\n\n');
          fullContent = fullContent ? `${fullContent}\n\n${cardsText}` : cardsText;
        }

        const sectionInsert = {
          submission_id: submissionId,
          section_order: section.order,
          title: section.title,
          content: fullContent,
          chart_link: section.chartLink,
          image_urls: section.imageUrls,
          image_captions: section.imageCaptions,
        };

        // Only include design_notes if the value exists (column may not exist yet)
        if (section.designNotes) {
          sectionInsert.design_notes = section.designNotes;
        }

        const { data: sectionData, error: sectionError } = await supabase
          .from('report_sections')
          .insert(sectionInsert)
          .select('id')
          .single();

        // If insert fails with design_notes, retry without it
        if (sectionError && section.designNotes) {
          console.error('Section insert error (retrying without design_notes):', sectionError.message);
          delete sectionInsert.design_notes;
          const { data: retryData, error: retryError } = await supabase
            .from('report_sections')
            .insert(sectionInsert)
            .select('id')
            .single();

          if (retryError) {
            console.error('Section insert retry error:', retryError);
            continue;
          }
          // Use retry data for stats insert
          var effectiveSectionData = retryData;
        } else if (sectionError) {
          console.error('Section insert error:', sectionError);
          continue;
        } else {
          var effectiveSectionData = sectionData;
        }

        // Insert stats for this section
        if (section.stats && section.stats.length > 0) {
          const statsToInsert = section.stats.map((stat, idx) => ({
            section_id: effectiveSectionData.id,
            stat_order: idx,
            label: stat.label,
            value: stat.value,
          }));

          const { error: statsError } = await supabase
            .from('report_section_stats')
            .insert(statsToInsert);

          if (statsError) {
            console.error('Stats insert error:', statsError);
          }
        }
      }

      // Update contributor session status if provided
      if (contributorSessionId) {
        await supabase
          .from('contributor_sessions')
          .update({
            status: 'submitted',
            submission_id: submissionId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contributorSessionId);
      }

      // Get submission and project info for notification
      const { data: submission } = await supabase
        .from('report_submissions')
        .select('organization_name, report_name, project_id')
        .eq('id', submissionId)
        .single();

      // Create notification for admins (will fail silently if table doesn't exist)
      if (submission?.project_id) {
        try {
          // Get the project to find the org_id
          const { data: project } = await supabase
            .from('report_projects')
            .select('org_id')
            .eq('id', submission.project_id)
            .single();

          if (project?.org_id) {
            await supabase
              .from('notifications')
              .insert({
                org_id: project.org_id,
                type: 'new_submission',
                title: 'New Submission',
                message: `New submission received for ${submission.report_name || 'report'} from ${submission.organization_name || 'Unknown'}`,
                link: `/projects/${submission.project_id}`,
                submission_id: submissionId,
              });
          }
        } catch (notifError) {
          // Silently fail if notifications table doesn't exist
          console.log('Notification insert skipped:', notifError?.code);
        }
      }

      return NextResponse.json({
        success: true,
        submissionId,
      });

    } else if (phase === 'update') {
      // Phase for updating existing submission (edit mode)
      const { submissionId, logoUrl, headshotUrl, letterImage1Url, letterImage2Url, sections } = body;

      console.log('=== UPDATE PHASE START ===');
      console.log('Update phase - submissionId:', submissionId, 'type:', typeof submissionId);
      console.log('Update phase - received sections:', JSON.stringify(sections?.map(s => ({
        order: s.order,
        title: s.title,
        imageUrls: s.imageUrls,
        imageUrlsLength: s.imageUrls?.length,
        imageCaptions: s.imageCaptions,
      })), null, 2));

      // Update submission with file URLs
      const { error: updateError } = await supabase
        .from('report_submissions')
        .update({
          logo_url: logoUrl,
          letter_headshot_url: headshotUrl,
          letter_image1_url: letterImage1Url,
          letter_image2_url: letterImage2Url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update submission', details: updateError.message },
          { status: 500 }
        );
      }

      // Delete existing sections and stats for this submission
      console.log('Fetching existing sections for submissionId:', submissionId);
      const { data: existingSections, error: fetchError } = await supabase
        .from('report_sections')
        .select('id, title, image_urls')
        .eq('submission_id', submissionId);

      console.log('Existing sections found:', existingSections?.length, 'error:', fetchError?.message);
      if (existingSections) {
        console.log('Existing sections data:', existingSections.map(s => ({
          id: s.id,
          title: s.title,
          image_urls_length: s.image_urls?.length,
        })));
      }

      if (existingSections && existingSections.length > 0) {
        const sectionIds = existingSections.map(s => s.id);

        // Delete stats first (foreign key constraint)
        const { error: statsDeleteError } = await supabase
          .from('report_section_stats')
          .delete()
          .in('section_id', sectionIds);
        console.log('Stats delete result:', statsDeleteError ? 'error: ' + statsDeleteError.message : 'success');

        // Delete sections
        const { error: sectionsDeleteError } = await supabase
          .from('report_sections')
          .delete()
          .eq('submission_id', submissionId);
        console.log('Sections delete result:', sectionsDeleteError ? 'error: ' + sectionsDeleteError.message : 'success');
      }

      // Insert updated sections
      console.log('Inserting updated sections...');
      for (const section of sections) {
        let fullContent = section.content || '';
        if (section.contentCards && section.contentCards.length > 0) {
          const cardsText = section.contentCards
            .map(card => `[CARD]\n${(card.title || '').trim()}\n${(card.body || '').trim()}\n[/CARD]`)
            .join('\n\n');
          fullContent = fullContent ? `${fullContent}\n\n${cardsText}` : cardsText;
        }

        const sectionInsert = {
          submission_id: submissionId,
          section_order: section.order,
          title: section.title,
          content: fullContent,
          chart_link: section.chartLink,
          image_urls: section.imageUrls,
          image_captions: section.imageCaptions,
        };

        if (section.designNotes) {
          sectionInsert.design_notes = section.designNotes;
        }

        console.log(`Inserting section ${section.order}:`, {
          title: sectionInsert.title,
          image_urls: sectionInsert.image_urls,
          image_captions: sectionInsert.image_captions,
        });

        const { data: sectionData, error: sectionError } = await supabase
          .from('report_sections')
          .insert(sectionInsert)
          .select('id')
          .single();

        if (sectionError) {
          console.error('Section insert error:', sectionError);
          continue;
        }
        console.log(`Section ${section.order} inserted with id:`, sectionData.id);

        // Verify the inserted data by fetching it back
        const { data: verifySection } = await supabase
          .from('report_sections')
          .select('id, title, image_urls, image_captions')
          .eq('id', sectionData.id)
          .single();
        console.log(`Section ${section.order} verification:`, {
          id: verifySection?.id,
          title: verifySection?.title,
          image_urls: verifySection?.image_urls,
          image_captions: verifySection?.image_captions,
        });

        // Insert stats for this section
        if (section.stats && section.stats.length > 0) {
          const statsToInsert = section.stats.map((stat, idx) => ({
            section_id: sectionData.id,
            stat_order: idx,
            label: stat.label,
            value: stat.value,
          }));

          const { error: statsError } = await supabase
            .from('report_section_stats')
            .insert(statsToInsert);

          if (statsError) {
            console.error('Stats insert error:', statsError);
          }
        }
      }

      // Final verification: fetch all sections to confirm data was saved
      const { data: finalSections, error: finalFetchError } = await supabase
        .from('report_sections')
        .select('id, title, image_urls, image_captions')
        .eq('submission_id', submissionId)
        .order('section_order');

      console.log('=== FINAL VERIFICATION ===');
      console.log('Final sections count:', finalSections?.length, 'error:', finalFetchError?.message);
      console.log('Final sections data:', JSON.stringify(finalSections?.map(s => ({
        id: s.id,
        title: s.title,
        image_urls: s.image_urls,
        image_captions: s.image_captions,
      })), null, 2));
      console.log('=== UPDATE PHASE COMPLETE ===');

      return NextResponse.json({
        success: true,
        submissionId,
        updated: true,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid phase' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
