/* eslint @typescript-eslint/no-unused-vars: ["error", { "ignoreRestSiblings": true }] */
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import styles from "./MarkdownRenderer.module.css";

interface MarkdownRendererProps {
  children: string;
  strict?: boolean;
}

export default function MarkdownRenderer({
  children,
  strict = false,
}: MarkdownRendererProps) {
  // We add basic styling to standard markdown tags since Tailwind resets some of them,
  // especially margins for paragraphs and lists.
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[[rehypeKatex, { strict }]]}
      components={{
        p: ({ node, ...props }) => (
          <p className={`mb-2 last:mb-0 ${styles.mathLine}`} {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside mb-2" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside mb-2" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className={`mb-1 ${styles.mathLine}`} {...props} />
        ),
        table: ({ node, ...props }) => (
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Tabel"
            tabIndex={0}
          >
            <table className={styles.table} {...props} />
          </div>
        ),
        th: ({ node, ...props }) => <th scope="col" {...props} />,
        a: ({ node, ...props }) => <a className="markdown-link" {...props} />,
        strong: ({ node, ...props }) => (
          <strong className="font-bold" {...props} />
        ),
        em: ({ node, ...props }) => <em className="italic" {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
