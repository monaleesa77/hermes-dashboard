declare module 'react-syntax-highlighter' {
  import type { ReactNode } from 'react';

  interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, unknown>;
    PreTag?: string | React.ComponentType;
    children?: ReactNode;
    className?: string;
  }

  export const Prism: React.FC<SyntaxHighlighterProps>;
  export default Prism;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const oneDark: Record<string, unknown>;
  export const oneLight: Record<string, unknown>;
}
