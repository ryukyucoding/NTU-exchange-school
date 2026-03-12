/**
 * Module declaration for posthog-js so TypeScript can resolve it
 * when the package is installed. The package ships its own types;
 * this file is a fallback for environments where resolution fails.
 */
declare module 'posthog-js' {
  interface PostHog {
    capture(event: string, properties?: Record<string, unknown>): void;
    init(key: string, options?: Record<string, unknown>): void;
  }
  const posthog: PostHog;
  export default posthog;
}
