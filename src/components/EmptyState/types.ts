export type EmptyStateContext = 'Home' | 'Map' | 'Search' | 'Photos' | 'MyEvents';
 
export interface EmptyStateProps {
  context: EmptyStateContext;
  cta?: boolean;
  ctaLabel?: string;
  onCtaPress?: () => void;
}