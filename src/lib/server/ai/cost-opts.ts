import { costContextFromRequest } from './cost-context'

/** Feature + userId for AI cost logging, from request headers. */
export function costOpts(req: Request, fallbackFeature: string) {
  return costContextFromRequest(req, fallbackFeature)
}
