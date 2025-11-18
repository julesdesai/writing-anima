import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { FileEdit } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const WritingArea = ({ content, onContentChange, autoFocus = false, feedback = [], hoveredFeedback = null }) => {
  const editorRef = useRef(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const cycleIntervalRef = useRef(null);
  const isUpdatingFromProps = useRef(false);
  const lastContentRef = useRef(''); // Initialize empty to force initial render

  // Memoize highlights to prevent recalculation on every render
  const highlights = useMemo(() => {
    if (!content || feedback.length === 0) {
      return [];
    }

    const result = [];

    // Collect all feedback positions (supporting both single and multi-position formats)
    feedback.forEach((item) => {
      const positions = item.positions || (item.position ? [item.position] : []);

      positions.forEach((position, positionIndex) => {
        if (position.start !== undefined && position.end !== undefined) {
          const start = Math.max(0, Math.min(position.start, content.length));
          const end = Math.max(start, Math.min(position.end, content.length));

          if (start < end) {
            // Verify the position matches the expected text (for accuracy)
            const actualText = content.substring(start, end);
            const expectedText = position.text;

            // If we have expected text and it doesn't match, try to find the correct position
            let adjustedStart = start;
            let adjustedEnd = end;

            if (expectedText && actualText !== expectedText) {
              // Try to find the expected text near the suggested position
              const searchRadius = 100; // Look within 100 characters
              const searchStart = Math.max(0, start - searchRadius);
              const searchEnd = Math.min(content.length, end + searchRadius);
              const searchArea = content.substring(searchStart, searchEnd);

              const foundIndex = searchArea.indexOf(expectedText);
              if (foundIndex !== -1) {
                adjustedStart = searchStart + foundIndex;
                adjustedEnd = adjustedStart + expectedText.length;
              }
            }

            // Check for overlaps with existing highlights
            const hasOverlap = result.some(existing =>
              (adjustedStart >= existing.start && adjustedStart < existing.end) ||
              (adjustedEnd > existing.start && adjustedEnd <= existing.end) ||
              (adjustedStart < existing.start && adjustedEnd > existing.end)
            );

            if (!hasOverlap) {
              result.push({
                start: adjustedStart,
                end: adjustedEnd,
                type: item.type,
                severity: item.severity,
                id: item.id,
                positionIndex,
                isHovered: hoveredFeedback === item.id,
                isCurrentPosition: hoveredFeedback === item.id && currentPositionIndex === positionIndex,
                text: content.slice(adjustedStart, adjustedEnd)
              });
            }
          }
        }
      });
    });

    return result.sort((a, b) => a.start - b.start);
  }, [content, feedback, hoveredFeedback, currentPositionIndex]);

  // Auto-scroll to highlighted feedback when hovered
  useEffect(() => {
    if (cycleIntervalRef.current) {
      clearInterval(cycleIntervalRef.current);
      cycleIntervalRef.current = null;
    }

    if (hoveredFeedback && editorRef.current) {
      const hoveredFeedbackData = feedback.find(f => f.id === hoveredFeedback);
      if (hoveredFeedbackData) {
        const editor = editorRef.current;

        let positions;
        if (hoveredFeedbackData.positions && hoveredFeedbackData.positions.length > 0) {
          positions = hoveredFeedbackData.positions;
        } else if (hoveredFeedbackData.position) {
          positions = [hoveredFeedbackData.position];
        }

        if (positions && positions.length > 0) {
          setCurrentPositionIndex(0);

          const scrollToPosition = (positionIndex) => {
            const targetPosition = positions[positionIndex];
            if (targetPosition) {
              // Find the highlight element
              const highlightEl = editor.querySelector(`[data-feedback-id="${hoveredFeedback}"][data-position-index="${positionIndex}"]`);
              if (highlightEl) {
                highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          };

          scrollToPosition(0);

          if (positions.length > 1) {
            let currentIndex = 0;
            cycleIntervalRef.current = setInterval(() => {
              currentIndex = (currentIndex + 1) % positions.length;
              setCurrentPositionIndex(currentIndex);
              scrollToPosition(currentIndex);
            }, 2000);
          }
        }
      }
    } else {
      setCurrentPositionIndex(0);
    }

    return () => {
      if (cycleIntervalRef.current) {
        clearInterval(cycleIntervalRef.current);
        cycleIntervalRef.current = null;
      }
    };
  }, [hoveredFeedback, feedback]);

  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  // Handle content changes from contenteditable
  const handleInput = useCallback((e) => {
    if (!isUpdatingFromProps.current) {
      const newContent = e.target.innerText;
      lastContentRef.current = newContent;
      onContentChange(newContent);
    }
  }, [onContentChange]);

  // Update editor content when prop changes (but preserve cursor position)
  useEffect(() => {
    if (editorRef.current && content !== lastContentRef.current) {
      isUpdatingFromProps.current = true;

      const editor = editorRef.current;
      const selection = window.getSelection();
      let cursorPosition = 0;

      // Save cursor position
      if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editor);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        cursorPosition = preCaretRange.toString().length;
      }

      // Update content
      renderContent();
      lastContentRef.current = content;

      // Restore cursor position
      if (cursorPosition > 0) {
        try {
          const textNodes = getTextNodes(editor);
          let currentPos = 0;

          for (const node of textNodes) {
            const nodeLength = node.textContent.length;
            if (currentPos + nodeLength >= cursorPosition) {
              const range = document.createRange();
              const offset = Math.min(cursorPosition - currentPos, nodeLength);
              range.setStart(node, offset);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              break;
            }
            currentPos += nodeLength;
          }
        } catch (e) {
          // Cursor restoration failed, just place at end
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      isUpdatingFromProps.current = false;
    }
  }, [content, highlights]);

  // Helper function to get all text nodes
  const getTextNodes = (element) => {
    const textNodes = [];
    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walk.nextNode())) {
      textNodes.push(node);
    }
    return textNodes;
  };

  // Render content with highlights into the editor
  const renderContent = useCallback(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const fragment = document.createDocumentFragment();

    if (highlights.length === 0) {
      // No highlights, just render plain text
      fragment.appendChild(document.createTextNode(content || ''));
    } else {
      // Render with highlights
      let lastIndex = 0;

      highlights.forEach((highlight, idx) => {
        // Add text before highlight
        if (highlight.start > lastIndex) {
          fragment.appendChild(document.createTextNode(content.slice(lastIndex, highlight.start)));
        }

        // Add highlighted text
        const mark = document.createElement('mark');
        mark.className = getHighlightClass(highlight.type, highlight.severity, highlight.isHovered, highlight.isCurrentPosition);
        mark.setAttribute('data-feedback-id', highlight.id);
        mark.setAttribute('data-position-index', highlight.positionIndex);
        mark.textContent = highlight.text;
        fragment.appendChild(mark);

        lastIndex = highlight.end;
      });

      // Add remaining text
      if (lastIndex < content.length) {
        fragment.appendChild(document.createTextNode(content.slice(lastIndex)));
      }
    }

    // Replace editor content
    editor.innerHTML = '';
    editor.appendChild(fragment);
  }, [content, highlights]);

  const getHighlightClass = (type, severity, isHovered, isCurrentPosition) => {
    const baseClasses = 'relative rounded px-1 transition-all duration-300';
    const typeClasses = {
      intellectual: 'bg-purple-100/40 border-b-2 border-purple-400/50',
      stylistic: 'bg-blue-100/40 border-b-2 border-blue-400/50',
      inquiry_integration: 'bg-green-100/40 border-b-2 border-green-400/50',
      complex_suggestion: 'bg-green-100/40 border-b-2 border-green-400/50',
      complex_insight: 'bg-yellow-100/40 border-b-2 border-yellow-400/50',
      framework_connection: 'bg-obsidian-accent-pale/40 border-b-2 border-obsidian-accent-light'
    };
    const severityClasses = {
      high: 'bg-opacity-70 shadow-obsidian',
      medium: 'bg-opacity-50 shadow-obsidian-sm',
      low: 'bg-opacity-30'
    };
    const hoverClasses = isHovered ? 'bg-opacity-90 shadow-obsidian-md scale-105 z-10 ring-2 ring-obsidian-accent-light ring-opacity-50' : '';
    const currentPositionClasses = isCurrentPosition ? 'ring-4 ring-obsidian-warning ring-opacity-75 animate-pulse' : '';

    return `${baseClasses} ${typeClasses[type] || typeClasses.intellectual} ${severityClasses[severity] || severityClasses.medium} ${hoverClasses} ${currentPositionClasses}`;
  };

  return (
    <div className="obsidian-panel h-[calc(100vh-180px)]">
      <div className="h-[36px] px-3 border-b border-obsidian-border flex items-center">
        <h2 className="text-xs font-semibold text-obsidian-text-tertiary uppercase tracking-wide">Editor</h2>
      </div>

      <div className="relative h-[calc(100%-36px)]" data-color-mode="dark">
        <MDEditor
          value={content}
          onChange={onContentChange}
          height="100%"
          preview="live"
          hideToolbar={false}
          visibleDragbar={false}
          style={{
            background: 'var(--obsidian-surface)',
            border: 'none',
            fontSize: '15px'
          }}
          textareaProps={{
            placeholder: 'Start writing...',
            style: {
              fontSize: '15px',
              lineHeight: '1.6'
            }
          }}
          previewOptions={{
            style: {
              fontSize: '15px',
              lineHeight: '1.6',
              background: 'var(--obsidian-surface)',
              color: 'var(--obsidian-text-primary)'
            }
          }}
        />

        {/* Obsidian theme customization for markdown editor */}
        <style>{`
          .w-md-editor {
            background: var(--obsidian-surface) !important;
            color: var(--obsidian-text-primary) !important;
            border: none !important;
          }

          .w-md-editor-toolbar {
            background: var(--obsidian-bg) !important;
            border-bottom: 1px solid var(--obsidian-border) !important;
            padding: 4px 8px !important;
          }

          .w-md-editor-toolbar button {
            color: var(--obsidian-text-secondary) !important;
            opacity: 0.7;
            transition: opacity 0.2s;
          }

          .w-md-editor-toolbar button:hover {
            background: var(--obsidian-accent-pale) !important;
            color: var(--obsidian-accent-primary) !important;
            opacity: 1;
          }

          /* Hide fullscreen button */
          .w-md-editor-toolbar button[aria-label*="fullscreen"],
          .w-md-editor-toolbar button[data-name="fullscreen"] {
            display: none !important;
          }

          /* Make vertical divider reach the top */
          .w-md-editor-area {
            height: 100% !important;
          }

          .w-md-editor-preview {
            border-left: 1px solid var(--obsidian-border) !important;
            height: 100% !important;
          }

          .w-md-editor-text-pre,
          .w-md-editor-text-input {
            background: var(--obsidian-surface) !important;
            color: var(--obsidian-text-primary) !important;
            font-size: 15px !important;
            line-height: 1.6 !important;
          }

          .w-md-editor-preview {
            background: var(--obsidian-surface) !important;
            color: var(--obsidian-text-primary) !important;
            padding: 16px !important;
          }

          .wmde-markdown {
            background: var(--obsidian-surface) !important;
            color: var(--obsidian-text-primary) !important;
          }

          .wmde-markdown h1,
          .wmde-markdown h2,
          .wmde-markdown h3,
          .wmde-markdown h4,
          .wmde-markdown h5,
          .wmde-markdown h6 {
            color: var(--obsidian-text-primary) !important;
            border-bottom-color: var(--obsidian-border) !important;
          }

          .wmde-markdown a {
            color: var(--obsidian-accent-primary) !important;
          }

          .wmde-markdown code {
            background: var(--obsidian-bg) !important;
            color: var(--obsidian-accent-primary) !important;
            border: 1px solid var(--obsidian-border) !important;
          }

          .wmde-markdown pre {
            background: var(--obsidian-bg) !important;
            border: 1px solid var(--obsidian-border) !important;
          }

          .wmde-markdown blockquote {
            border-left-color: var(--obsidian-accent-primary) !important;
            color: var(--obsidian-text-secondary) !important;
          }

          /* Scrollbar styling */
          .w-md-editor-text,
          .w-md-editor-preview {
            scrollbar-width: thin;
            scrollbar-color: var(--obsidian-border) var(--obsidian-surface);
          }

          .w-md-editor-text::-webkit-scrollbar,
          .w-md-editor-preview::-webkit-scrollbar {
            width: 8px;
          }

          .w-md-editor-text::-webkit-scrollbar-track,
          .w-md-editor-preview::-webkit-scrollbar-track {
            background: var(--obsidian-surface);
          }

          .w-md-editor-text::-webkit-scrollbar-thumb,
          .w-md-editor-preview::-webkit-scrollbar-thumb {
            background: var(--obsidian-border);
            border-radius: 4px;
          }

          .w-md-editor-text::-webkit-scrollbar-thumb:hover,
          .w-md-editor-preview::-webkit-scrollbar-thumb:hover {
            background: var(--obsidian-text-muted);
          }
        `}</style>
      </div>
    </div>
  );
};

export default WritingArea;