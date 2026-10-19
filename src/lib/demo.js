import { isBackendConfigured } from './supabase'
import { DEV_PREVIEW } from '../auth/devPreview'
// Demonstration tools appear only when no backend is connected (or in dev preview). Everything they do is labelled DEMO.
export const DEMO_TOOLS = !isBackendConfigured || DEV_PREVIEW
