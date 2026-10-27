// Demo story: Mainframe Engineering. Nothing here is real data.
// A senior mainframe engineer captures what they know about a nightly claims batch system.
// Edit this file to change the story. In TESTS, {name} becomes the expert's first name.

const FILES = [
  { name: 'system_diagram.pdf', size: 2457600, type: 'PDF' },
  { name: 'runbook_2019.docx', size: 880640, type: 'DOCX' },
  { name: 'CLMPROC_walkthrough.md', size: 49152, type: 'MD' },
  { name: 'interview_0921_transcript.txt', size: 98304, type: 'TXT' },
];

const SECTIONS = [
  { id: 'ops', title: 'Batch operations' },
  { id: 'debug', title: 'Debugging' },
  { id: 'code', title: 'Code and data' },
  { id: 'people', title: 'People and process' },
];

// status: complete | missing (a gap the expert needs to fill) | conflict (two sources disagree)
const POINTS = [
  {
    id: 'ops-cycle', section: 'ops', title: 'Nightly batch cycle', status: 'complete',
    summary: 'CLMPROC starts at 01:00, after the ledger closes. It runs three steps: extract, rate and post. If extract runs past 02:30, hold the rate step, because it would read a half-written file.',
    sources: [{ file: 'system_diagram.pdf', where: 'page 3' }, { file: 'runbook_2019.docx', where: 'section 2.1' }, { file: 'CLMPROC_walkthrough.md', where: 'job card' }],
    excerpt: { file: 'CLMPROC_walkthrough.md', where: 'job card', lang: 'JCL', code: "//CLMPROC  JOB (ACCT),'CLAIMS NIGHTLY',CLASS=A\n//STEP010  EXEC PGM=CLMEXTR\n//STEP030  EXEC PGM=CLMRATE,COND=(4,LT)\n//STEP050  EXEC PGM=CLMPOST" },
    links: ['ops-restart', 'ops-hold'], keywords: ['nightly', 'schedule', 'extract', 'post', 'cycle', 'start', 'runs'],
  },
  {
    id: 'ops-restart', section: 'ops', title: 'JCL restart procedure', status: 'missing',
    summary: 'Restart from STEP030, never from the top. First delete the GDG generation that the failed run created.',
    sources: [{ file: 'runbook_2019.docx', where: 'section 4.2' }, { file: 'CLMPROC_walkthrough.md', where: 'lines 88–120' }],
    excerpt: { file: 'runbook_2019.docx', where: 'section 4.2', lang: 'Runbook', code: 'Before restarting CLMPROC:\n  1. Delete CLM.WORK.EXTRACT\n  2. Delete CLM.WORK.RATED\n  3. Restart from STEP030' },
    question: 'Which datasets have to be cleaned up before a restart? The runbook lists two, but the job references four.',
    example: 'All four: CLM.WORK.EXTRACT, CLM.WORK.SORTED, CLM.WORK.RATED and CLM.WORK.SUSPENSE. The runbook is out of date. SORTED and SUSPENSE were added in 2021.',
    links: ['code-gdg', 'people-mentor'], keywords: ['restart', 'rerun', 'step030', 'datasets', 'cleanup', 'jcl', 'failed'],
  },
  {
    id: 'ops-monthend', section: 'ops', title: 'Month-end edge cases', status: 'conflict',
    summary: 'At month-end the rate step runs twice: once for regular claims and once for backdated ones.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '12:40' }, { file: 'runbook_2019.docx', where: 'section 6.1' }],
    conflict: {
      text: 'Your interview and the runbook disagree about what happens when month-end falls on a Sunday.',
      sides: [
        { source: 'interview_0921_transcript.txt', claim: 'If month-end is a Sunday, the second pass waits until Monday morning.' },
        { source: 'runbook_2019.docx', claim: 'Month-end processing always finishes on the last calendar day.' },
      ],
    },
    question: 'When month-end falls on a Sunday, when does the second rate pass actually run?',
    example: 'Monday at 06:00, after the ledger reopens. The runbook is wrong here. We changed it in 2020 and never updated the document.',
    links: ['ops-cycle', 'debug-s322'], keywords: ['month', 'month-end', 'sunday', 'backdated', 'twice', 'second', 'pass'],
  },
  {
    id: 'ops-release', section: 'ops', title: 'Release checklist', status: 'complete',
    summary: 'Freeze changes on Thursday and promote on Friday at 18:00. Never release during month-end week.',
    sources: [{ file: 'runbook_2019.docx', where: 'section 8' }],
    links: ['people-approve'], keywords: ['release', 'promote', 'freeze', 'deploy', 'friday'],
  },
  {
    id: 'ops-twice', section: 'ops', title: 'Why CLMPROC runs twice', status: 'missing',
    summary: '',
    sources: [{ file: 'system_diagram.pdf', where: 'page 5' }],
    question: 'Some nights CLMPROC runs twice, and nobody else knows why. Can you explain it in your own words? Sketch it with the pen if that is easier.',
    example: 'The second run picks up claims from the late feed that arrives after 23:00. It only runs if the flag file CLM.FLAG.LATEFEED exists.',
    links: ['ops-cycle', 'code-feed'], keywords: ['twice', 'second', 'late', 'feed', 'flag'],
  },
  {
    id: 'ops-hold', section: 'ops', title: 'Holding the rate step', status: 'complete',
    summary: 'To hold the rate step, put STEP030 on hold in the scheduler and tell ops on-call. Release it when extract has finished.',
    sources: [{ file: 'runbook_2019.docx', where: 'section 3.4' }],
    links: ['people-call'], keywords: ['hold', 'scheduler', 'rate', 'step030'],
  },
  {
    id: 'debug-s0c7', section: 'debug', title: 'Abend S0C7 debugging', status: 'missing',
    summary: 'Nine times out of ten, an S0C7 is a packed-decimal field with spaces in it, sent by the upstream feed.',
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'lines 210–240' }, { file: 'interview_0921_transcript.txt', where: '05:15' }],
    excerpt: { file: 'CLMPROC_walkthrough.md', where: 'copybook CLMREC', lang: 'COBOL', code: '05  CL-CLAIM-AMT    PIC S9(7)V99 COMP-3.\n05  CL-PAID-AMT     PIC S9(7)V99 COMP-3.\n05  CL-SERVICE-DT   PIC 9(8).' },
    question: 'How do you find which record caused the S0C7? Walk me through the steps you take in the dump.',
    example: 'Take the offset from the abend message and look it up in the compile listing to find the field. Then search the input file for the record with spaces in that position. It is usually the claim amount.',
    links: ['debug-dump', 'code-feed'], keywords: ['s0c7', 'abend', 'abended', 'packed', 'decimal', 'dump', 'record', 'spaces'],
  },
  {
    id: 'debug-db2', section: 'debug', title: 'DB2 lock timeouts (-911)', status: 'complete',
    summary: 'A -911 during posting usually means the online region is still up. Check CICS first, then rerun only the post step.',
    sources: [{ file: 'runbook_2019.docx', where: 'section 5.3' }],
    links: ['people-call'], keywords: ['db2', '911', 'lock', 'timeout', 'deadlock', 'cics'],
  },
  {
    id: 'debug-dump', section: 'debug', title: 'Reading a system dump', status: 'missing',
    summary: 'You start with the abend code and the failing instruction.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '08:02' }],
    question: 'Which parts of a dump do you look at first, and which parts do you skip?',
    example: 'The PSW and the registers first, then the program’s working storage. I skip the system areas unless it is an S878 or another storage problem.',
    links: ['debug-codes'], keywords: ['dump', 'psw', 'registers', 'storage'],
  },
  {
    id: 'debug-codes', section: 'debug', title: 'Common abend codes', status: 'complete',
    summary: 'S0C7 means bad data, S0C4 a bad address, S322 a time-out and S806 a module missing from the load library.',
    sources: [{ file: 'runbook_2019.docx', where: 'appendix B' }],
    links: ['debug-s0c7', 'debug-s322'], keywords: ['abend', 'codes', 's0c4', 's806', 's322'],
  },
  {
    id: 'debug-s322', section: 'debug', title: 'S322 time-outs at month-end', status: 'complete',
    summary: 'At month-end, extract can hit an S322 because the volume doubles. Raise TIME on STEP010 to 60 for that night only.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '14:30' }],
    links: ['ops-monthend'], keywords: ['s322', 'timeout', 'time', 'volume'],
  },
  {
    id: 'debug-logs', section: 'debug', title: 'Where the logs are', status: 'complete',
    summary: 'Job logs are in SDSF under the CLM prefix. Older logs are archived to CLM.ARCHIVE.LOGS for 90 days.',
    sources: [{ file: 'runbook_2019.docx', where: 'section 5.1' }],
    links: [], keywords: ['logs', 'sdsf', 'archive', 'joblog'],
  },
  {
    id: 'code-copybook', section: 'code', title: 'Copybook conventions', status: 'complete',
    summary: 'Every field starts with its record type: CL-, PY- or RT-. Never REDEFINE a COMP-3 field. That caused the 1998 incident.',
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'conventions' }],
    links: ['code-rates'], keywords: ['copybook', 'fields', 'redefine', 'comp-3', 'naming'],
  },
  {
    id: 'code-rates', section: 'code', title: 'Legacy rate tables', status: 'conflict',
    summary: 'Rate tables from before 2004 use a different rounding rule from the current ones.',
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'paragraph 4100' }, { file: 'system_diagram.pdf', where: 'page 7' }],
    excerpt: { file: 'CLMPROC_walkthrough.md', where: 'paragraph 4100-ROUND-RATE', lang: 'COBOL', code: '4100-ROUND-RATE.\n    IF RT-TABLE-YEAR < 2004\n        COMPUTE WS-RATE ROUNDED = RT-BASE * RT-FACTOR\n    END-IF.' },
    conflict: {
      text: 'The code walkthrough and the system diagram describe the old rounding rule differently.',
      sides: [
        { source: 'CLMPROC_walkthrough.md', claim: 'Pre-2004 tables round half up.' },
        { source: 'system_diagram.pdf', claim: 'Pre-2004 tables use banker’s rounding.' },
      ],
    },
    question: 'Which rounding rule do the pre-2004 tables really use?',
    example: 'Half up, in paragraph 4100-ROUND-RATE of CLMRATE. The note in the system diagram is wrong.',
    links: ['code-copybook', 'people-finance'], keywords: ['rate', 'rates', 'rounding', 'tables', '2004', 'legacy'],
  },
  {
    id: 'code-gdg', section: 'code', title: 'GDG cleanup', status: 'complete',
    summary: 'Each run creates a new generation of CLM.DAILY.OUTPUT. Keep the last seven, and never delete generation 0 by hand.',
    sources: [{ file: 'runbook_2019.docx', where: 'section 4.4' }],
    links: ['ops-restart'], keywords: ['gdg', 'generation', 'cleanup', 'delete', 'output'],
  },
  {
    id: 'code-naming', section: 'code', title: 'Dataset naming', status: 'complete',
    summary: 'Work files are CLM.WORK.*, outputs are CLM.DAILY.*, and anything under CLM.TEST.* is safe to delete.',
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'datasets' }],
    links: ['code-gdg'], keywords: ['dataset', 'naming', 'work', 'test', 'files'],
  },
  {
    id: 'code-feed', section: 'code', title: 'Upstream feed format', status: 'missing',
    summary: 'The feed is a fixed-width file sent by three partners.',
    sources: [{ file: 'system_diagram.pdf', where: 'page 2' }],
    question: 'Which fields in the upstream feed are most often wrong, and how do you spot them?',
    example: 'Claim amount and service date. The amount has spaces when a provider leaves it blank, and one partner sends dates as MMDDYY instead of YYYYMMDD.',
    links: ['debug-s0c7', 'ops-twice'], keywords: ['feed', 'upstream', 'fields', 'partner', 'format'],
  },
  {
    id: 'code-suspense', section: 'code', title: 'Suspense file', status: 'complete',
    summary: 'Claims that fail rating go to CLM.WORK.SUSPENSE and are processed again the next night.',
    sources: [{ file: 'CLMPROC_walkthrough.md', where: 'error handling' }],
    links: ['ops-restart'], keywords: ['suspense', 'failed', 'claims', 'reprocess'],
  },
  {
    id: 'people-call', section: 'people', title: 'Who to call', status: 'complete',
    summary: 'Storage problems go to Dana (ext. 4410). Scheduling goes to ops on-call. Anything that touches rates goes to finance, not IT.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '21:05' }],
    links: ['people-finance'], keywords: ['call', 'contact', 'who', 'storage', 'dana', 'ops'],
  },
  {
    id: 'people-approve', section: 'people', title: 'Change approval', status: 'complete',
    summary: 'Every production change needs a ticket approved by the claims product owner and one senior engineer.',
    sources: [{ file: 'runbook_2019.docx', where: 'section 8.2' }],
    links: ['ops-release'], keywords: ['change', 'approval', 'ticket', 'production'],
  },
  {
    id: 'people-handover', section: 'people', title: 'On-call handover', status: 'missing',
    summary: 'On-call rotates every Monday morning.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '23:40' }],
    question: 'What do you always tell the next person when you hand over on-call?',
    example: 'Which jobs are on hold and why, any open tickets with the storage team, and whether month-end is coming up.',
    links: ['people-call'], keywords: ['handover', 'on-call', 'oncall', 'rotation'],
  },
  {
    id: 'people-history', section: 'people', title: 'History of the system', status: 'complete',
    summary: 'CLMPROC was written in 1987 and moved to DB2 in 1999. Most of the rating logic is still the original code.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '01:10' }],
    links: ['code-rates'], keywords: ['history', '1987', 'original', 'written'],
  },
  {
    id: 'people-finance', section: 'people', title: 'Working with finance', status: 'complete',
    summary: 'Finance owns rate changes. They send a signed rate sheet, and IT only loads it.',
    sources: [{ file: 'interview_0921_transcript.txt', where: '18:20' }],
    links: ['code-rates'], keywords: ['finance', 'sheet', 'rate', 'change'],
  },
  {
    id: 'people-mentor', section: 'people', title: 'What newcomers get wrong', status: 'missing',
    summary: '',
    sources: [{ file: 'interview_0921_transcript.txt', where: '25:55' }],
    question: 'What mistake do new engineers make most often on this system?',
    example: 'Restarting from the top after an abend. It posts the same claims twice, and finance has to reverse them by hand.',
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
    answer: 'On Monday at 06:00, after the ledger reopens. The 2019 runbook says otherwise, but it is out of date.',
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
  summary: 'How a senior engineer keeps a nightly COBOL claims system running: restarts, abends and month-end.',
  twinName: 'Claims Batch System',
  newcomer: 'a new engineer',
  roleExample: 'Senior mainframe engineer',
  uploadHint: 'Runbooks, code walkthroughs, design notes, incident reports, interview transcripts.',
  skills: ['COBOL', 'JCL', 'DB2', 'CICS', 'IMS', 'VSAM', 'Assembler', 'REXX', 'PL/I'],
  files: FILES,
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
    building: 'twin-claims',
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
