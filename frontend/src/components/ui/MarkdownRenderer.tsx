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
  onImageClick?: (image: { src: string; label: string }) => void;
}

export default function MarkdownRenderer({
  children,
  strict = false,
  onImageClick,
}: MarkdownRendererProps) {
  // We add basic styling to standard markdown tags since Tailwind resets some of them,
  // especially margins for paragraphs, hanging-indent lists, display math, and discussion diagrams.
  return (
    <div className={styles.root}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { strict }]]}
        components={{
          p: ({ node, ...props }) => (
            <p className={`${styles.paragraph} ${styles.mathLine}`} {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className={`${styles.list} ${styles.unorderedList}`} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className={`${styles.list} ${styles.orderedList}`} {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className={`${styles.listItem} ${styles.mathLine}`} {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className={styles.callout} {...props} />
          ),
          hr: ({ node, ...props }) => <hr className={styles.divider} {...props} />,
          img: ({ node, src, alt, ...props }) => {
            const imgSrc = typeof src === "string" ? src : "";
            const imgAlt = alt || "Ilustrasi pembahasan";
            if (!imgSrc) return null;
            if (onImageClick) {
              return (
                <button
                  type="button"
                  className={styles.imageButton}
                  onClick={() => onImageClick({ src: imgSrc, label: imgAlt })}
                  aria-label={`Perbesar ${imgAlt.toLowerCase()}`}
                  title="Klik untuk memperbesar gambar"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={imgAlt}
                    className={styles.image}
                    loading="lazy"
                    {...props}
                  />
                  <span className={styles.imageHint}>Klik untuk perbesar</span>
                </button>
              );
            }
            return (
              <span className={styles.imageFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={imgAlt}
                  className={styles.image}
                  loading="lazy"
                  {...props}
                />
              </span>
            );
          },
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
    </div>
  );
}
