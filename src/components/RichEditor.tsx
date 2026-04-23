"use client";
import { useRef, useEffect } from "react";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";

interface RichEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = "120px",
  onBlur,
  onKeyDown
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize content only once or when value changes externally (not while focused)
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className="flex flex-col border border-stone-200 rounded-2xl overflow-hidden bg-white focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
      <div className="flex items-center gap-1 p-1 border-b border-stone-100 bg-stone-50 shrink-0">
        <button type="button" onClick={() => exec('bold')} className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors" title="Bold">
          <Bold className="w-4 h-4"/>
        </button>
        <button type="button" onClick={() => exec('italic')} className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors" title="Italic">
          <Italic className="w-4 h-4"/>
        </button>
        <button type="button" onClick={() => exec('underline')} className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors" title="Underline">
          <Underline className="w-4 h-4"/>
        </button>
        <div className="w-px h-4 bg-stone-200 mx-1"/>
        <button type="button" onClick={() => exec('insertUnorderedList')} className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors" title="Bullet List">
          <List className="w-4 h-4"/>
        </button>
        <button type="button" onClick={() => exec('insertOrderedList')} className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition-colors" title="Numbered List">
          <ListOrdered className="w-4 h-4"/>
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="p-3.5 outline-none text-sm text-stone-700 editor-content overflow-y-auto"
        style={{ minHeight }}
        data-placeholder={placeholder}
      />
    </div>
  );
}
