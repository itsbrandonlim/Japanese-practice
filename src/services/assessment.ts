/** An available provider must disclose its processing terms before a learner
 * explicitly approves sending a specific take for a specific scripted phrase. */
export interface ProcessingTerms {
  processor: string
  region: string
  retention: string
  cost: string
}
export interface AssessmentRequest {
  reference: { id: string; text: string; locale: 'ja-JP' }
  take: Blob
  consent: { terms: ProcessingTerms; acceptedAt: string }
  signal: AbortSignal
}
export interface AssessmentResult {
  provider: string
  dimensions: { name: string; value: number; scale: string }[]
  limitations: string[]
}
export type PronunciationAssessmentProvider =
  | { state: 'unavailable'; message: string }
  | { state: 'available'; terms: ProcessingTerms; assess(request: AssessmentRequest): Promise<AssessmentResult> }

export const assessmentProvider: PronunciationAssessmentProvider = {
  state: 'unavailable', message: 'Assessment unavailable',
}
