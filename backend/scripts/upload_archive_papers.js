const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'manuscripts';

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureBucket() {
  try {
    const { data: existing, error: getError } = await supabase.storage.getBucket(bucketName);
    if (existing && !getError) {
      console.log(`Bucket "${bucketName}" exists.`);
      return true;
    }
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 20 * 1024 * 1024,
    });
    if (createError && !/already exists/i.test(createError.message || '')) {
      console.error(`Could not create bucket "${bucketName}":`, createError.message);
      return false;
    }
    console.log(`Created public bucket "${bucketName}".`);
    return true;
  } catch (err) {
    console.error('Bucket setup error:', err);
    return false;
  }
}

async function runUpload() {
  console.log('Starting archive papers upload to Supabase...');
  await ensureBucket();

  const metadataPath = path.join(__dirname, '../papers_metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('papers_metadata.json not found! Run parse_papers.py first.');
    process.exit(1);
  }

  const papers = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log(`Loaded ${papers.length} paper records from metadata.`);

  // Group papers by (volume, issue)
  const issuesMap = new Map();
  for (const item of papers) {
    const key = `${item.volume}_${item.issue}`;
    if (!issuesMap.has(key)) {
      issuesMap.set(key, {
        volume: item.volume,
        issue: item.issue,
        month: item.month,
        year: item.year,
        is_current: item.issue === 7, // Latest issue is current
        title: `Volume ${item.volume}, Issue ${item.issue} (${item.month} ${item.year})`,
        description: `International Journal of Engineering Practices and Applications (IJEPA), Volume ${item.volume}, Issue ${item.issue}`,
        papers: [],
      });
    }
    issuesMap.get(key).papers.push(item);
  }

  console.log(`Found ${issuesMap.size} distinct issues to upsert.`);

  // Process each issue
  for (const [key, issueData] of issuesMap.entries()) {
    console.log(`\n========================================`);
    console.log(`Processing Issue: ${issueData.title}`);

    // Check if issue exists
    let { data: existingIssue } = await supabase
      .from('issues')
      .select('*')
      .eq('volume', issueData.volume)
      .eq('issue', issueData.issue)
      .eq('year', issueData.year)
      .maybeSingle();

    let issueId;
    if (existingIssue) {
      console.log(`Issue Vol ${issueData.volume} Issue ${issueData.issue} exists with ID: ${existingIssue.id}`);
      issueId = existingIssue.id;
      // Update fields if needed
      await supabase
        .from('issues')
        .update({
          month: issueData.month,
          is_current: issueData.is_current,
          title: issueData.title,
          description: issueData.description,
        })
        .eq('id', issueId);
    } else {
      const { data: newIssue, error: createError } = await supabase
        .from('issues')
        .insert({
          volume: issueData.volume,
          issue: issueData.issue,
          month: issueData.month,
          year: issueData.year,
          is_current: issueData.is_current,
          title: issueData.title,
          description: issueData.description,
        })
        .select('*')
        .single();

      if (createError) {
        console.error(`Failed to create issue Vol ${issueData.volume} Issue ${issueData.issue}:`, createError);
        continue;
      }
      issueId = newIssue.id;
      console.log(`Created issue Vol ${issueData.volume} Issue ${issueData.issue} with ID: ${issueId}`);
    }

    // Process papers in this issue
    for (const paper of issueData.papers) {
      console.log(` -> Processing Paper ${paper.paper_code}: ${paper.title.slice(0, 50)}...`);

      // Upload PDF to Supabase Storage
      let pdfUrl = null;
      if (fs.existsSync(paper.local_pdf_path)) {
        const fileBuffer = fs.readFileSync(paper.local_pdf_path);
        const storagePath = `papers/vol${paper.volume}-issue${paper.issue}/${paper.paper_code}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error(`    Storage upload error for ${paper.paper_code}:`, uploadError.message);
        } else {
          const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
          pdfUrl = urlData?.publicUrl || null;
          console.log(`    Uploaded PDF: ${pdfUrl}`);
        }
      } else {
        console.warn(`    PDF file not found locally: ${paper.local_pdf_path}`);
      }

      // Check if paper exists in DB
      let { data: existingPaper } = await supabase
        .from('papers')
        .select('*')
        .eq('doi', paper.doi)
        .maybeSingle();

      if (!existingPaper) {
        // Search by exact title
        const { data: byTitle } = await supabase
          .from('papers')
          .select('*')
          .eq('title', paper.title)
          .maybeSingle();
        existingPaper = byTitle;
      }

      let paperId;
      if (existingPaper) {
        paperId = existingPaper.id;
        console.log(`    Paper exists with ID: ${paperId}, updating...`);
        await supabase
          .from('papers')
          .update({
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            keywords: paper.keywords,
            status: 'published',
            submission_date: paper.submission_date,
            publication_date: paper.publication_date,
            doi: paper.doi,
            pdf_url: pdfUrl || existingPaper.pdf_url,
            payment_status: 'paid',
          })
          .eq('id', paperId);
      } else {
        const { data: newPaper, error: paperInsertError } = await supabase
          .from('papers')
          .insert({
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            keywords: paper.keywords,
            status: 'published',
            submission_date: paper.submission_date,
            publication_date: paper.publication_date,
            doi: paper.doi,
            pdf_url: pdfUrl,
            payment_status: 'paid',
          })
          .select('*')
          .single();

        if (paperInsertError) {
          console.error(`    Error inserting paper ${paper.paper_code}:`, paperInsertError);
          continue;
        }
        paperId = newPaper.id;
        console.log(`    Inserted paper ${paper.paper_code} with ID: ${paperId}`);
      }

      // Link paper to issue in issue_papers table
      const { data: existingAssignment } = await supabase
        .from('issue_papers')
        .select('*')
        .eq('issue_id', issueId)
        .eq('paper_id', paperId)
        .maybeSingle();

      if (!existingAssignment) {
        const { error: assignError } = await supabase
          .from('issue_papers')
          .insert({
            issue_id: issueId,
            paper_id: paperId,
          });

        if (assignError) {
          console.error(`    Error linking paper ${paperId} to issue ${issueId}:`, assignError.message);
        } else {
          console.log(`    Linked paper ${paperId} to issue ${issueId}`);
        }
      } else {
        console.log(`    Paper ${paperId} already linked to issue ${issueId}`);
      }
    }
  }

  // Ensure is_current is set properly on issues table (Issue 7 is current, others are not)
  const { data: currentIssues } = await supabase.from('issues').select('id, volume, issue, is_current');
  console.log('\nFinal Issues in Database:');
  console.table(currentIssues);

  console.log('\nUpload and database seeding completed successfully!');
}

runUpload().catch((err) => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
