import type { LucideIcon } from 'lucide-react'
import {
  ImagePlus,
  GitBranch,
  Images,
  Shapes,
  FileStack,
  HardHat,
  FileCheck2,
  Link2,
  ClipboardCheck,
  Share2,
  Eye,
  Hash,
  CalendarDays,
  LayoutTemplate,
  Coins,
  Quote,
  Users,
  GitPullRequest,
  Library,
  FolderKanban,
  Mic,
  Video,
  AudioLines,
  FileSearch,
  Database,
  Network,
} from 'lucide-react'

export interface FeatureHelp {
  what: string
  how: string
}

export interface UpcomingFeature {
  label: string
  icon: LucideIcon
  help: FeatureHelp
}

export interface UpcomingGroup {
  label: string
  features: UpcomingFeature[]
}

const SOON = 'Coming soon — planned for a future release. Not available in the editor yet.'

/** Roadmap items from plans/future_scope.md and plans/rag-pipeline.md */
export const UPCOMING_FEATURE_GROUPS: UpcomingGroup[] = [
  {
    label: 'Content generation',
    features: [
      {
        label: 'Image generation',
        icon: ImagePlus,
        help: {
          what: 'Generate site photos, diagrams, or technical illustrations from selected text, then insert them with captions and alt text.',
          how: SOON,
        },
      },
      {
        label: 'Diagrams & flowcharts',
        icon: GitBranch,
        help: {
          what: 'Convert selected procedures or method statements into flowcharts, sequence diagrams, and process diagrams.',
          how: SOON,
        },
      },
      {
        label: 'Before / after visuals',
        icon: Images,
        help: {
          what: 'Generate progress comparison images and As-Built vs Planned visual comparisons.',
          how: SOON,
        },
      },
      {
        label: 'Icon & callout library',
        icon: Shapes,
        help: {
          what: 'Reusable blocks for PPE icons, hazard callouts, hold-point markers, and quality indicators.',
          how: SOON,
        },
      },
    ],
  },
  {
    label: 'Construction authoring',
    features: [
      {
        label: 'Method statement builder',
        icon: FileStack,
        help: {
          what: 'Generate structured method statements: scope, plant, materials, sequence, risks, controls, permits, and quality checks.',
          how: SOON,
        },
      },
      {
        label: 'Toolbox talk & RAMS',
        icon: HardHat,
        help: {
          what: 'Generate Toolbox Talks and RAMS documents, or convert notes into standardized formats.',
          how: SOON,
        },
      },
      {
        label: 'Spec / clause validation',
        icon: FileCheck2,
        help: {
          what: 'Validate content against uploaded specifications, standards, project brief, and company glossary.',
          how: SOON,
        },
      },
      {
        label: 'Drawing references',
        icon: Link2,
        help: {
          what: 'Link paragraphs to drawing numbers, figure references, sheet numbers, and revision IDs.',
          how: SOON,
        },
      },
      {
        label: 'Inspection & test plans (ITP)',
        icon: ClipboardCheck,
        help: {
          what: 'Native editor blocks for inspection points, hold points, checklists, and QA/QC records.',
          how: SOON,
        },
      },
    ],
  },
  {
    label: 'Social & publishing',
    features: [
      {
        label: 'Multi-platform export',
        icon: Share2,
        help: {
          what: 'Export documents as LinkedIn posts, X threads, Instagram carousels, and email newsletters.',
          how: SOON,
        },
      },
      {
        label: 'Platform preview',
        icon: Eye,
        help: {
          what: 'Live preview for character limits, image crops, formatting, and layout per platform.',
          how: SOON,
        },
      },
      {
        label: 'Smart social tags',
        icon: Hash,
        help: {
          what: 'Generate hashtags, mentions, project tags, safety tags, and trade-specific keywords.',
          how: SOON,
        },
      },
      {
        label: 'Publishing assistant',
        icon: CalendarDays,
        help: {
          what: 'Create weekly posting schedules, short- and long-form copy, and toolbox updates.',
          how: SOON,
        },
      },
      {
        label: 'Site update cards',
        icon: LayoutTemplate,
        help: {
          what: 'Ready-to-share cards with photo, caption, location, and status for WhatsApp, Teams, and Slack.',
          how: SOON,
        },
      },
    ],
  },
  {
    label: 'Graphs & analytics',
    features: [
      {
        label: 'Cost & usage insights',
        icon: Coins,
        help: {
          what: 'Embed lightweight cost analysis, resource usage, budget summaries, and consumption trends.',
          how: SOON,
        },
      },
      {
        label: 'Citations & sources',
        icon: Quote,
        help: {
          what: 'Attach references, source links, standards, evidence, and supporting documents.',
          how: SOON,
        },
      },
    ],
  },
  {
    label: 'Collaboration & workflow',
    features: [
      {
        label: 'Review modes',
        icon: Users,
        help: {
          what: 'AI review perspectives for client, engineer, project manager, site supervisor, and construction crew.',
          how: SOON,
        },
      },
      {
        label: 'AI approval workflow',
        icon: GitPullRequest,
        help: {
          what: 'Comments, suggested edits, approval history, and an audit trail.',
          how: SOON,
        },
      },
      {
        label: 'Templates library',
        icon: Library,
        help: {
          what: 'Pre-built templates for weekly/daily reports, incidents, VOs, NCRs, handover, site instructions, and minutes.',
          how: SOON,
        },
      },
      {
        label: 'Project workspace',
        icon: FolderKanban,
        help: {
          what: 'Multiple documents with shared glossary, standards, assets, and centralized project knowledge.',
          how: SOON,
        },
      },
    ],
  },
  {
    label: 'Media & multimodal',
    features: [
      {
        label: 'Accurate dictation',
        icon: Mic,
        help: {
          what: 'Push-to-talk mic that inserts speech at the cursor using Whisper / gpt-4o-transcribe, biased toward construction terms.',
          how: SOON,
        },
      },
      {
        label: 'Video generation',
        icon: Video,
        help: {
          what: 'Generate site clips, explainer videos, construction animations, and video stills.',
          how: SOON,
        },
      },
      {
        label: 'Voice-to-document',
        icon: AudioLines,
        help: {
          what: 'Convert longer recordings into structured notes, meeting minutes, Toolbox Talks, and action items.',
          how: SOON,
        },
      },
      {
        label: 'PDF & drawing intelligence',
        icon: FileSearch,
        help: {
          what: 'Import and extract text, tables, figures, drawings, annotations, and metadata with intelligent referencing.',
          how: SOON,
        },
      },
    ],
  },
  {
    label: 'Knowledge (RAG)',
    features: [
      {
        label: 'Hybrid project RAG',
        icon: Database,
        help: {
          what: 'Real retrieval over project docs: vector + keyword search, parent-document chunks, and metadata filters (not filename-only stubs).',
          how: SOON,
        },
      },
      {
        label: 'Multimodal ingest',
        icon: Network,
        help: {
          what: 'Ingest PDF, DOCX, Excel, PPT, scans, drawings, and photos with OCR, tables, and vision summaries for Draft citations.',
          how: SOON,
        },
      },
    ],
  },
]
