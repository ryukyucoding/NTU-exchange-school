declare module 'tailwind-merge' {
  // Minimal typing shim for environments where package types are not available.
  // This keeps `next build` type-checking unblocked.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function twMerge(...classLists: any[]): string;
}


