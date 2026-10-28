// Demo story: Mainframe Engineering. Nothing here is real data.
// A senior mainframe engineer's know-how, learned from files about two batch systems (the projects here):
// the nightly claims run and the monthly billing run. Points use the same fields as demo/design.js.
// In TESTS, {name} becomes the expert's first name. Edit this file to change the story.

const FILES = [
  { name: 'claims_system_diagram.pdf', size: 2457600, type: 'PDF' },
  { name: 'claims_runbook_2019.docx', size: 880640, type: 'DOCX' },
  { name: 'CLMPROC_walkthrough.md', size: 49152, type: 'MD' },
  { name: 'billing_runbook.docx', size: 734003, type: 'DOCX' },
  { name: 'interview_0921_transcript.txt', size: 98304, type: 'TXT' },
];

const PROJECTS = [
  { id: 'claims', name: 'Claims batch', what: 'nightly claims run, CLMPROC' },
  { id: 'billing', name: 'Billing batch', what: 'monthly billing run, BILLRUN' },
];

const SECTIONS = [
  { id: 'ops', title: 'Batch operations' },
  { id: 'debug', title: 'Debugging' },
  { id: 'code', title: 'Code and data' },
  { id: 'people', title: 'People and process' },
];

const COPYBOOK = { kind: 'code', file: 'CLMPROC_walkthrough.md', where: 'copybook CLMREC', lang: 'COBOL', code: '05  CL-CLAIM-AMT    PIC S9(7)V99 COMP-3.\n05  CL-PAID-AMT     PIC S9(7)V99 COMP-3.\n05  CL-SERVICE-DT   PIC 9(8).' };

// status: complete | missing (a gap the expert needs to fill) | conflict (two files disagree)
const POINTS = [
  // ----- Batch operations -----
  {
    id: 'ops-cycle', section: 'ops', title: 'Nightly batch cycle', status: 'complete', projects: ['claims', 'billing'],
    summary: 'Each batch system runs a fixed sequence of steps after the online day closes. Knowing when it starts, the order of the steps and the latest safe finish for each step is the base of everything else.',
    why: 'Most incidents start when a step begins before the one it depends on has finished, and reads a half-written file.',
    how: [
      'Start only after the ledger and the online region have closed.',
      'Run the steps in order: extract, process, post.',
      'Know the latest safe finish for each step.',
      'If a step runs late, hold the next one instead of letting it start.',
    ],
    solution: 'Never let a step start on half-written input. If a step runs past its window, hold the next one.',
    figure: [
      { kind: 'steps', at: 'how', caption: 'Claims: CLMPROC starts at 01:00 and must finish before the online day at 06:00.', items: ['01:00 Extract', 'Rate', 'Post', '06:00 Online day'] },
      { kind: 'code', at: 'how', file: 'CLMPROC_walkthrough.md', where: 'job card', lang: 'JCL', code: "//CLMPROC  JOB (ACCT),'CLAIMS NIGHTLY',CLASS=A\n//STEP010  EXEC PGM=CLMEXTR\n//STEP030  EXEC PGM=CLMRATE,COND=(4,LT)\n//STEP050  EXEC PGM=CLMPOST" },
    ],
    examples: [
      { project: 'claims', text: 'CLMPROC starts at 01:00, after the ledger closes: extract, rate, post. If extract runs past 02:30, the rate step is held.', source: 'CLMPROC_walkthrough.md · job card' },
      { project: 'billing', text: 'BILLRUN runs at 22:00 on the first of each month: extract, calculate, print, post.', source: 'billing_runbook.docx · section 1' },
    ],
    sources: [{ file: 'claims_system_diagram.pdf', where: 'page 3' }, { file: 'claims_runbook_2019.docx', where: 'section 2.1' }, { file: 'CLMPROC_walkthrough.md', where: 'job card' }, { file: 'billing_runbook.docx', where: 'section 1' }],
    links: ['ops-restart', 'ops-hold'], keywords: ['nightly', 'schedule', 'extract', 'post', 'cycle', 'start', 'runs', 'steps'],
  },
  {
    id: 'ops-restart', section: 'ops', title: 'JCL restart procedure', status: 'missing', projects: ['claims', 'billing'],
    summary: 'After an abend, a job is restarted from the step that failed, never from the top, once the files the failed run created are cleaned up.',
    why: 'Restarting from the top processes records twice. In claims it posts the same claims twice, and finance has to reverse them by hand.',
    how: [
      'Find the failed step in the job log.',
      'Delete the GDG generation the failed run created.',
      'Clean up the work datasets.',
      'Restart from the failed step.',
    ],
    figure: { kind: 'code', at: 'how', file: 'claims_runbook_2019.docx', where: 'section 4.2', lang: 'Runbook', code: 'Before restarting CLMPROC:\n  1. Delete CLM.WORK.EXTRACT\n  2. Delete CLM.WORK.RATED\n  3. Restart from STEP030' },
    examples: [
      { project: 'claims', text: 'Restart from STEP030, after deleting the GDG generation the failed run created.', source: 'claims_runbook_2019.docx · section 4.2' },
      { project: 'billing', text: 'Restart from the calculate step. The print step must never run twice, or customers get two bills.', source: 'billing_runbook.docx · section 4' },
    ],
    gap: {
      kind: 'missing', at: 'how',
      note: 'The claims runbook lists two work datasets to clean up before a restart, but the job uses four.',
      ask: 'Which datasets have to be cleaned up before a restart?',
      example: 'All four: CLM.WORK.EXTRACT, CLM.WORK.SORTED, CLM.WORK.RATED and CLM.WORK.SUSPENSE. The runbook is out of date. SORTED and SUSPENSE were added in 2021.',
    },
    sources: [{ file: 'claims_runbook_2019.docx', where: 'section 4.2' }, { file: 'CLMPROC_walkthrough.md', where: 'lines 88–120' }, { file: 'billing_runbook.docx', where: 'section 4' }],
    links: ['code-gdg', 'people-mentor'], keywords: ['restart', 'rerun', 'step030', 'datasets', 'cleanup', 'jcl', 'failed'],
  },
  {
    id: 'ops-monthend', section: 'ops', title: 'Month-end edge cases', status: 'conflict', projects: ['claims'],
    summary: 'At month-end, the claims rate step runs twice: once for regular claims and once for backdated ones.',
    why: 'Month-end is when the volume doubles, and a timing mistake costs the most.',
    examples: [
      { project: 'claims', text: 'The second pass picks up backdated claims, which arrive in the last two days of the month.', source: 'interview_0921_transcript.txt · 12:40' },
    ],
    gap: {
      kind: 'conflict', at: 'solution',
      note: 'Your interview and the claims runbook disagree about what happens when month-end falls on a Sunday.',
      sides: [
        { source: 'interview_0921_transcript.txt', claim: 'If month-end is a Sunday, the second pass waits until Monday morning.' },
        { source: 'claims_runbook_2019.docx', claim: 'Month-end processing always finishes on the last calendar day.' },
      ],
      ask: 'When month-end falls on a Sunday, when does the second rate pass actually run?',
      example: 'Monday at 06:00, after the ledger reopens. The runbook is wrong here. We changed it in 2020 and never updated the document.',
    },
    sources: [{ file: 'interview_0921_transcript.txt', where: '12:40' }, { file: 'claims_runbook_2019.docx', where: 'section 6.1' }],
    links: ['ops-cycle', 'debug-s322'], keywords: ['month', 'month-end', 'sunday', 'backdated', 'twice', 'second', 'pass'],
  },
  {
    id: 'ops-release', section: 'ops', title: 'Release checklist', status: 'complete', projects: ['claims', 'billing'],
    summary: 'Changes are frozen before a fixed release window, and nothing is released in month-end week.',
    why: 'A quiet, predictable window means someone is around if a change breaks the night’s run.',
    how: ['Freeze changes on Thursday.', 'Promote on Friday at 18:00.', 'Never release in month-end week.', 'Watch the first night’s run after a release.'],
    solution: 'A fixed window, no releases at month-end, and someone watching the first run.',
    examples: [
      { project: 'claims', text: 'Freeze on Thursday, promote on Friday at 18:00.', source: 'claims_runbook_2019.docx · section 8' },
      { project: 'billing', text: 'No billing changes in the last five days of the month.', source: 'billing_runbook.docx · section 7' },
    ],
    sources: [{ file: 'claims_runbook_2019.docx', where: 'section 8' }, { file: 'billing_runbook.docx', where: 'section 7' }],
    links: ['people-approve'], keywords: ['release', 'promote', 'freeze', 'deploy', 'friday', 'change'],
  },
  {
    id: 'ops-twice', section: 'ops', title: 'Why CLMPROC runs twice', status: 'missing', projects: ['claims'],
    summary: 'Some nights CLMPROC runs twice. The system diagram shows the second run, but nothing in your files explains it.',
    why: 'Without the reason, someone on call will cancel the second run, and the late claims will wait a day.',
    gap: {
      kind: 'missing', at: 'how', sketch: true,
      note: 'Only the system diagram shows the second run, and it doesn’t say what starts it.',
      ask: 'Some nights CLMPROC runs twice, and nobody else knows why. Can you explain it? Sketch it with the pen if that’s easier.',
      example: 'The second run picks up claims from the late feed that arrives after 23:00. It only runs if the flag file CLM.FLAG.LATEFEED exists.',
    },
    sources: [{ file: 'claims_system_diagram.pdf', where: 'page 5' }],
    links: ['ops-cycle', 'code-feed'], keywords: ['twice', 'second', 'late', 'feed', 'flag'],
  },
  {
    id: 'ops-hold', section: 'ops', title: 'Holding a step', status: 'complete', projects: ['claims', 'billing'],
    summary: 'When a step has to wait, put it on hold in the scheduler and tell ops on-call. Release it when the step it depends on has finished.',
    how: ['Put the step on hold in the scheduler.', 'Tell ops on-call which step, and why.', 'Release it when the earlier step has finished.'],
    solution: 'Hold the step in the scheduler. Never cancel the job to make it wait.',
    examples: [
      { project: 'claims', text: 'Hold STEP030, the rate step, if extract runs past 02:30.', source: 'claims_runbook_2019.docx · section 3.4' },
      { project: 'billing', text: 'Hold the print step if the calculate totals don’t balance.', source: 'billing_runbook.docx · section 3' },
    ],
    sources: [{ file: 'claims_runbook_2019.docx', where: 'section 3.4' }, { file: 'billing_runbook.docx', where: 'section 3' }],
    links: ['people-call'], keywords: ['hold', 'scheduler', 'rate', 'step030', 'wait'],
  },

  // ----- Debugging -----
  {
    id: 'debug-s0c7', section: 'debug', title: 'Abend S0C7 debugging', status: 'missing', projects: ['claims', 'billing'],
    summary: 'An S0C7 is a data exception: a packed-decimal field with something in it that isn’t a number, usually spaces sent by an upstream feed.',
    why: 'It’s the most common abend in both systems, and the fix is in the data, not the code.',
    figure: { ...COPYBOOK, at: 'summary' },
    examples: [
      { project: 'claims', at: 'summary', text: 'Nine times out of ten, it’s spaces in the claim amount.', source: 'CLMPROC_walkthrough.md · lines 210–240' },
      { project: 'billing', at: 'summary', text: 'In billing, it’s usually a missing premium on a new policy.', source: 'billing_runbook.docx · section 5' },
    ],
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your files say what causes an S0C7, but not how you find the bad record.',
      ask: 'How do you find which record caused the S0C7? Walk me through the steps.',
      example: 'Take the offset from the abend message and look it up in the compile listing to find the field. Then search the input file for the record with spaces in that position. It’s usually the claim amount.',
    },
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'lines 210–240' }, { file: 'interview_0921_transcript.txt', where: '05:15' }, { file: 'billing_runbook.docx', where: 'section 5' }],
    links: ['debug-dump', 'code-feed'], keywords: ['s0c7', 'abend', 'abended', 'packed', 'decimal', 'dump', 'record', 'spaces'],
  },
  {
    id: 'debug-db2', section: 'debug', title: 'DB2 lock timeouts (-911)', status: 'complete', projects: ['claims'],
    summary: 'A -911 during posting means something online still holds a lock, usually the CICS region that didn’t close on time.',
    how: ['Check whether the online region is still up.', 'Ask ops to close it, or wait until it closes.', 'Rerun only the post step.'],
    solution: 'It’s a lock, not a bug: free the lock, then rerun the one step.',
    examples: [
      { project: 'claims', text: 'Usually the CICS region didn’t shut down at 00:45.', source: 'claims_runbook_2019.docx · section 5.3' },
    ],
    sources: [{ file: 'claims_runbook_2019.docx', where: 'section 5.3' }],
    links: ['people-call'], keywords: ['db2', '911', 'lock', 'timeout', 'deadlock', 'cics'],
  },
  {
    id: 'debug-dump', section: 'debug', title: 'Reading a system dump', status: 'missing', projects: ['claims', 'billing'],
    summary: 'Every dump starts with the abend code and the failing instruction. Your files don’t say what to read after that.',
    why: 'A dump has thousands of lines. Knowing what to skip is what makes it readable.',
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your interview starts to explain how you read a dump, then moves on.',
      ask: 'Which parts of a dump do you look at first, and which parts do you skip?',
      example: 'The PSW and the registers first, then the program’s working storage. I skip the system areas unless it’s an S878 or another storage problem.',
    },
    sources: [{ file: 'interview_0921_transcript.txt', where: '08:02' }],
    links: ['debug-codes'], keywords: ['dump', 'psw', 'registers', 'storage'],
  },
  {
    id: 'debug-codes', section: 'debug', title: 'Common abend codes', status: 'complete', projects: ['claims', 'billing'],
    summary: 'A handful of abend codes cover almost every failure in the batch. Each one points to a different kind of fix.',
    figure: {
      kind: 'table', at: 'summary', caption: 'From the claims runbook, appendix B.',
      head: ['Code', 'Means', 'Look at'],
      rows: [['S0C7', 'Bad data in a numeric field', 'The input record'], ['S0C4', 'Bad address', 'The program, often a table overflow'], ['S322', 'Time limit reached', 'The volume, then the TIME parameter'], ['S806', 'Program not found', 'The load library']],
    },
    solution: 'Learn these four first. The code tells you whether to look at the data, the program or the job.',
    sources: [{ file: 'claims_runbook_2019.docx', where: 'appendix B' }],
    links: ['debug-s0c7', 'debug-s322'], keywords: ['abend', 'codes', 's0c4', 's806', 's322'],
  },
  {
    id: 'debug-s322', section: 'debug', title: 'S322 time-outs at month-end', status: 'complete', projects: ['claims'],
    summary: 'At month-end, the claims extract can hit an S322 because the volume doubles. Raise the time limit on the extract step for that night only.',
    figure: { kind: 'bars', at: 'summary', caption: 'Claims extract volume at month-end, compared with a normal night.', unit: '×', bars: [{ label: 'Normal night', value: 1 }, { label: 'Month-end', value: 2.1 }] },
    how: ['Raise TIME on STEP010 to 60 for month-end night.', 'Set it back the next morning.'],
    solution: 'Raise the limit for one night, then set it back.',
    examples: [
      { project: 'claims', text: 'Extract hit an S322 at month-end three times in 2023, always with the limit at 30.', source: 'interview_0921_transcript.txt · 14:30' },
    ],
    sources: [{ file: 'interview_0921_transcript.txt', where: '14:30' }],
    links: ['ops-monthend'], keywords: ['s322', 'timeout', 'time', 'volume', 'month-end'],
  },
  {
    id: 'debug-logs', section: 'debug', title: 'Where the logs are', status: 'complete', projects: ['claims', 'billing'],
    summary: 'Job logs are in SDSF under each system’s prefix. Older logs are archived for 90 days.',
    examples: [
      { project: 'claims', text: 'CLM prefix in SDSF, archived to CLM.ARCHIVE.LOGS.', source: 'claims_runbook_2019.docx · section 5.1' },
      { project: 'billing', text: 'BIL prefix in SDSF, archived to BIL.ARCHIVE.LOGS.', source: 'billing_runbook.docx · section 2' },
    ],
    sources: [{ file: 'claims_runbook_2019.docx', where: 'section 5.1' }, { file: 'billing_runbook.docx', where: 'section 2' }],
    links: [], keywords: ['logs', 'sdsf', 'archive', 'joblog'],
  },

  // ----- Code and data -----
  {
    id: 'code-copybook', section: 'code', title: 'Copybook conventions', status: 'complete', projects: ['claims'],
    summary: 'Every field name starts with its record type: CL-, PY- or RT-. A packed (COMP-3) field is never redefined.',
    why: 'Redefining a packed field caused the 1998 incident, when two days of claims were rated with the wrong amounts.',
    figure: { ...COPYBOOK, at: 'summary' },
    solution: 'Prefix every field with its record type, and never REDEFINE a COMP-3 field.',
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'conventions' }],
    links: ['code-rates'], keywords: ['copybook', 'fields', 'redefine', 'comp-3', 'naming'],
  },
  {
    id: 'code-rates', section: 'code', title: 'Legacy rate tables', status: 'conflict', projects: ['claims'],
    summary: 'Rate tables from before 2004 use a different rounding rule from the current ones.',
    figure: { kind: 'code', at: 'summary', file: 'CLMPROC_walkthrough.md', where: 'paragraph 4100-ROUND-RATE', lang: 'COBOL', code: '4100-ROUND-RATE.\n    IF RT-TABLE-YEAR < 2004\n        COMPUTE WS-RATE ROUNDED = RT-BASE * RT-FACTOR\n    END-IF.' },
    gap: {
      kind: 'conflict', at: 'solution',
      note: 'The code walkthrough and the system diagram describe the old rounding rule differently.',
      sides: [
        { source: 'CLMPROC_walkthrough.md', claim: 'Pre-2004 tables round half up.' },
        { source: 'claims_system_diagram.pdf', claim: 'Pre-2004 tables use banker’s rounding.' },
      ],
      ask: 'Which rounding rule do the pre-2004 tables really use?',
      example: 'Half up, in paragraph 4100-ROUND-RATE of CLMRATE. The note in the system diagram is wrong.',
    },
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'paragraph 4100' }, { file: 'claims_system_diagram.pdf', where: 'page 7' }],
    links: ['code-copybook', 'people-finance'], keywords: ['rate', 'rates', 'rounding', 'tables', '2004', 'legacy'],
  },
  {
    id: 'code-gdg', section: 'code', title: 'GDG cleanup', status: 'complete', projects: ['claims', 'billing'],
    summary: 'Each run creates a new generation of the output dataset. The GDG limit removes old generations, and generation 0 is never deleted by hand.',
    why: 'Generation 0 is what the next step reads. Deleting it by hand breaks the next run.',
    solution: 'Let the GDG limit clean up. Never delete the current generation by hand.',
    examples: [
      { project: 'claims', text: 'CLM.DAILY.OUTPUT keeps the last seven generations.', source: 'claims_runbook_2019.docx · section 4.4' },
      { project: 'billing', text: 'BIL.MONTHLY.OUTPUT keeps twelve, one for each month.', source: 'billing_runbook.docx · section 4' },
    ],
    sources: [{ file: 'claims_runbook_2019.docx', where: 'section 4.4' }, { file: 'billing_runbook.docx', where: 'section 4' }],
    links: ['ops-restart'], keywords: ['gdg', 'generation', 'cleanup', 'delete', 'output'],
  },
  {
    id: 'code-naming', section: 'code', title: 'Dataset naming', status: 'complete', projects: ['claims', 'billing'],
    summary: 'Work files, outputs and test files have their own prefixes, so you can tell at a glance what’s safe to delete.',
    figure: {
      kind: 'table', at: 'summary', caption: 'Dataset prefixes in both systems.',
      head: ['Kind', 'Claims', 'Billing'],
      rows: [['Work files', 'CLM.WORK.*', 'BIL.WORK.*'], ['Outputs', 'CLM.DAILY.*', 'BIL.MONTHLY.*'], ['Safe to delete', 'CLM.TEST.*', 'BIL.TEST.*']],
    },
    solution: 'Anything with TEST in its prefix is safe to delete. Nothing else is.',
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'datasets' }, { file: 'billing_runbook.docx', where: 'section 2' }],
    links: ['code-gdg'], keywords: ['dataset', 'naming', 'work', 'test', 'files', 'prefix'],
  },
  {
    id: 'code-feed', section: 'code', title: 'Upstream feed format', status: 'missing', projects: ['claims'],
    summary: 'The claims feed is a fixed-width file sent by three partners. Your files don’t say which fields go wrong.',
    why: 'Most S0C7 abends start in the feed. Knowing the usual suspects saves hours.',
    gap: {
      kind: 'missing', at: 'how',
      note: 'The system diagram shows the feed, but not which fields are usually wrong.',
      ask: 'Which fields in the upstream feed are most often wrong, and how do you spot them?',
      example: 'Claim amount and service date. The amount has spaces when a provider leaves it blank, and one partner sends dates as MMDDYY instead of YYYYMMDD.',
    },
    sources: [{ file: 'claims_system_diagram.pdf', where: 'page 2' }],
    links: ['debug-s0c7', 'ops-twice'], keywords: ['feed', 'upstream', 'fields', 'partner', 'format'],
  },
  {
    id: 'code-suspense', section: 'code', title: 'Suspense file', status: 'complete', projects: ['claims'],
    summary: 'Claims that fail rating go to a suspense file, CLM.WORK.SUSPENSE, and are processed again the next night.',
    solution: 'Don’t fix suspended claims by hand. They retry on their own the next night; look into the ones that fail twice.',
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'error handling' }],
    links: ['ops-restart'], keywords: ['suspense', 'failed', 'claims', 'reprocess'],
  },

  // ----- People and process -----
  {
    id: 'people-call', section: 'people', title: 'Who to call', status: 'complete', projects: ['claims', 'billing'],
    summary: 'Each kind of problem has one owner. Calling the right person first saves an hour of being passed around.',
    figure: {
      kind: 'table', at: 'summary', caption: 'From the interview and the billing runbook.',
      head: ['Problem', 'Call'],
      rows: [['Storage', 'Dana, ext. 4410'], ['Scheduling', 'Ops on-call'], ['Anything that touches rates', 'Finance, not IT'], ['The billing print run', 'The print vendor’s night desk']],
    },
    solution: 'Storage goes to Dana, scheduling to ops on-call, and rates to finance.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '21:05' }, { file: 'billing_runbook.docx', where: 'section 9' }],
    links: ['people-finance'], keywords: ['call', 'contact', 'who', 'storage', 'dana', 'ops'],
  },
  {
    id: 'people-approve', section: 'people', title: 'Change approval', status: 'complete', projects: ['claims', 'billing'],
    summary: 'Every production change needs a ticket approved by the product owner and one senior engineer.',
    how: ['Open a change ticket with the risk and the back-out plan.', 'Get approval from the product owner.', 'Get approval from one senior engineer who didn’t write the change.'],
    solution: 'Two approvals, one of them from someone who didn’t write the change.',
    sources: [{ file: 'claims_runbook_2019.docx', where: 'section 8.2' }],
    links: ['ops-release'], keywords: ['change', 'approval', 'ticket', 'production'],
  },
  {
    id: 'people-handover', section: 'people', title: 'On-call handover', status: 'missing', projects: ['claims', 'billing'],
    summary: 'On-call rotates every Monday morning. Your interview mentions the handover, but not what it covers.',
    why: 'Most weekend incidents start with something the last person knew and didn’t pass on.',
    gap: {
      kind: 'missing', at: 'how',
      note: 'Your interview says when on-call changes hands, but not what you hand over.',
      ask: 'What do you always tell the next person when you hand over on-call?',
      example: 'Which jobs are on hold and why, any open tickets with the storage team, and whether month-end or the billing run is coming up.',
    },
    sources: [{ file: 'interview_0921_transcript.txt', where: '23:40' }],
    links: ['people-call'], keywords: ['handover', 'on-call', 'oncall', 'rotation'],
  },
  {
    id: 'people-history', section: 'people', title: 'History of the system', status: 'complete', projects: ['claims'],
    summary: 'CLMPROC was written in 1987 and moved to DB2 in 1999. Most of the rating logic is still the original code.',
    why: 'Odd-looking code often has a reason from the 1980s. Ask before you “clean it up”.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '01:10' }],
    links: ['code-rates'], keywords: ['history', '1987', 'original', 'written'],
  },
  {
    id: 'people-finance', section: 'people', title: 'Working with finance', status: 'complete', projects: ['claims', 'billing'],
    summary: 'Finance owns rate changes. They send a signed rate sheet, and IT only loads it.',
    solution: 'Never change a rate without a signed sheet from finance.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '18:20' }],
    links: ['code-rates'], keywords: ['finance', 'sheet', 'rate', 'change'],
  },
  {
    id: 'people-mentor', section: 'people', title: 'What newcomers get wrong', status: 'missing', projects: ['claims', 'billing'],
    summary: 'Your interview mentions the mistakes new engineers make, but not what they are.',
    gap: {
      kind: 'missing', at: 'solution',
      note: 'This is advice only you can give. Nothing in your files covers it.',
      ask: 'What mistake do new engineers make most often on these systems?',
      example: 'Restarting from the top after an abend. In claims it posts the same claims twice, and in billing it prints two bills. Always restart from the failed step.',
    },
    sources: [{ file: 'interview_0921_transcript.txt', where: '25:55' }],
    links: ['ops-restart'], keywords: ['newcomers', 'mistake', 'new', 'junior', 'wrong'],
  },
];

// Final validation: the twin and the expert answer the same questions, then we compare.
const TESTS = [
  {
    id: 'q1', points: ['debug-s0c7'],
    question: 'The nightly run abended with an S0C7 in the rate step. What do you do first?',
    answer: 'Check the upstream feed for spaces in a packed-decimal field, which causes about nine in ten S0C7s. Use the offset in the abend message to find the field and the bad record, fix it, then restart from STEP030, not from the top.',
    partial: 'Probably bad data in a packed-decimal field. I can’t say how to find the record, because {name} hasn’t confirmed that part yet.',
    keywords: ['feed', 'spaces', 'packed', 'offset', 'record', 'step030'],
    example: 'Look for spaces in a packed-decimal field from the feed. I find the record from the offset, fix it, and restart from STEP030.',
  },
  {
    id: 'q2', points: ['ops-restart'],
    question: 'You need to restart CLMPROC after a failed extract. What has to happen first?',
    answer: 'Delete the GDG generation the failed run created, and clean up all four work datasets: EXTRACT, SORTED, RATED and SUSPENSE. Then restart from STEP030.',
    partial: 'Delete the GDG generation from the failed run, then restart from STEP030. I’m not sure which work datasets need cleaning, because {name} hasn’t confirmed it.',
    keywords: ['gdg', 'delete', 'four', 'sorted', 'suspense', 'step030'],
    example: 'Delete the new GDG generation and all four work files, including SORTED and SUSPENSE. Then restart from STEP030.',
  },
  {
    id: 'q3', points: ['ops-monthend'],
    question: 'Month-end falls on a Sunday. When does the second rate pass run?',
    answer: 'On Monday at 06:00, after the ledger reopens. The 2019 runbook says otherwise, but it’s out of date.',
    partial: 'My sources disagree. The runbook says the last calendar day, but {name}’s interview says Monday. Check with ops before acting.',
    keywords: ['monday', '06:00', 'ledger', 'runbook'],
    example: 'Monday morning at 06:00, when the ledger reopens. Ignore the runbook on this one.',
  },
];

// The demo account's published twin.
const CICS_SECTIONS = [
  { id: 'region', title: 'Region operations' },
  { id: 'trouble', title: 'Troubleshooting' },
];

const CICS_POINTS = [
  ['region', 'cics-start', 'Starting the region', 'Start CICSPRD1 only after DB2 is up. Never cold-start on a weekday.', ['start', 'cold', 'region']],
  ['region', 'cics-stop', 'Shutdown order', 'Close the claims transactions first, then shut down CICS, then DB2.', ['shutdown', 'stop', 'order']],
  ['region', 'cics-window', 'Batch window', 'The online region stays up until 00:45 so the batch can start at 01:00.', ['window', 'batch', 'online']],
  ['region', 'cics-owner', 'Who owns CICS', 'The CICS systems programming group owns the region. Raise a ticket for any SIT change.', ['owner', 'owns', 'cics', 'sit', 'ticket']],
  ['trouble', 'cics-clmi', 'Transaction CLMI hangs', 'CLMI is the claims inquiry screen. If it hangs, purge the task. Don’t restart the region.', ['clmi', 'hang', 'purge']],
  ['trouble', 'cics-sos', 'Short on storage', 'Short-on-storage usually comes from a runaway CLMU task. Purge it, then check the EDSA limit.', ['storage', 'sos', 'edsa']],
  ['trouble', 'cics-aey9', 'AEY9 abends', 'AEY9 means DB2 is not connected. Check DB2CONN and restart the connection, not CICS.', ['aey9', 'db2conn', 'connection']],
  ['trouble', 'cics-slow', 'Slow response times', 'If CLMI takes more than two seconds to respond, the DB2 indexes need a reorg.', ['slow', 'response', 'reorg']],
].map(([section, id, title, summary, keywords], i) => ({
  id, section, title, summary, keywords, status: 'complete',
  sources: [{ file: i % 2 ? 'region_notes.md' : 'cics_ops_guide.pdf', where: `section ${i + 1}` }],
  links: [],
}));

export default {
  id: 'mainframe',
  label: 'Mainframe Engineering',
  icon: 'terminal',
  summary: 'How a senior engineer keeps two COBOL batch systems running: restarts, abends, month-end and who to call.',
  twinName: 'Batch Systems Support',
  newcomer: 'a new engineer',
  roleExample: 'Senior mainframe engineer',
  uploadHint: 'Runbooks, code walkthroughs, design notes, incident reports and interview transcripts, from every system you look after.',
  skills: ['COBOL', 'JCL', 'DB2', 'CICS', 'IMS', 'VSAM', 'Assembler', 'REXX', 'PL/I'],
  files: FILES,
  projects: PROJECTS,
  sections: SECTIONS,
  points: POINTS,
  tests: TESTS,
  // Example questions offered in "Try your twin".
  trySuggestions: [
    'The rate step abended with S0C7. What should I check?',
    'Who do I call about a storage problem?',
    'When can I release a change?',
  ],
  // The returning user behind "Use a demo account": the twin above in progress, plus one published twin.
  account: {
    user: { name: 'Robert Alvarez', email: 'robert@northwind.example', role: 'Senior mainframe engineer', company: 'Northwind Insurance', years: '31', skills: ['COBOL', 'JCL', 'DB2', 'CICS'] },
    building: 'twin-batch',
    published: {
      id: 'twin-cics',
      name: 'CICS Online Region',
      files: [{ name: 'cics_ops_guide.pdf', size: 1572864, type: 'PDF' }, { name: 'region_notes.md', size: 24576, type: 'MD' }],
      sections: CICS_SECTIONS,
      points: CICS_POINTS,
      suggestions: ['How do I start the CICS region?', 'CLMI hangs. What should I do?', 'Who owns CICS?'],
      match: 88,
      terms: { access: 'company', model: 'per-answer', rate: 0.25, credit: true, escalate: true, limits: '' },
      licensees: 2,
      monthly: [125, 162, 125], // answers per month, oldest first
    },
  },
};
