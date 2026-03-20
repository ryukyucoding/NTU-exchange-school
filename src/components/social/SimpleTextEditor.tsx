'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Link, Image as ImageIcon, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { markdownToHtml, htmlToMarkdown } from '@/lib/utils';

const LINK_STYLE = 'color: #2563eb; text-decoration: underline;';

/** 游標或選取範圍是否在編輯器內的某個 <a> 裡 */
function findAnchorInSelection(editor: HTMLElement): HTMLAnchorElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const fromNode = (n: Node | null): HTMLAnchorElement | null => {
    let el: HTMLElement | null =
      n?.nodeType === Node.TEXT_NODE ? (n.parentElement as HTMLElement | null) : (n as HTMLElement | null);
    while (el && el !== editor) {
      if (el.tagName === 'A' && el instanceof HTMLAnchorElement) return el;
      el = el.parentElement;
    }
    return null;
  };
  return fromNode(sel.anchorNode) || fromNode(sel.focusNode);
}

interface SimpleTextEditorProps {
  value: string; // Markdown 格式
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * WYSIWYG 編輯器：所見即所得
 * - 粗體、連結（可編輯／移除）、圖片；工具列在編輯區下方
 */
export default function SimpleTextEditor({
  value,
  onChange,
  placeholder = '輸入內容...',
}: SimpleTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkDialogMode, setLinkDialogMode] = useState<'create' | 'edit'>('create');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const editingLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const isUpdatingRef = useRef(false);
  /** 注音/IME 進行中：keydown 的 isComposing 常不準，用事件追蹤 */
  const imeComposingRef = useRef(false);
  /** Chrome 等：第一次聚焦時設段落為 <p>，單次 Enter 較容易看出換行（仍不攔截 Enter，與注音相容） */
  const didSetParagraphSepRef = useRef(false);

  const flushToMarkdown = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || isUpdatingRef.current || imeComposingRef.current) return;
    const html = editor.innerHTML;
    const markdown = htmlToMarkdown(html);
    if (markdown !== value) onChange(markdown);
  }, [value, onChange]);

  const updateFromMarkdown = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    isUpdatingRef.current = true;
    const html = markdownToHtml(value);
    editor.innerHTML = html || '<br>';
    setHasContent(!!value.trim());
    requestAnimationFrame(() => { isUpdatingRef.current = false; });
  }, [value]);

  useEffect(() => {
    updateFromMarkdown();
  }, [updateFromMarkdown]);

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = editor.innerText?.trim() || '';
    const hasAny = text.length > 0 || editor.querySelector('img');
    setHasContent(!!hasAny);
    // composition 中不同步：避免讀到過渡 DOM 或與 IME 打架造成重複字
    if (!isUpdatingRef.current && !imeComposingRef.current) {
      requestAnimationFrame(flushToMarkdown);
    }
  };

  const handleCompositionStart = () => {
    imeComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    const finish = () => {
      imeComposingRef.current = false;
      flushToMarkdown();
    };
    // 延遲再 flush，避免 composition 與 DOM 尾幀不同步
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(finish, 100);
      });
    });
  };

  const handleEditorFocus = () => {
    if (didSetParagraphSepRef.current) return;
    didSetParagraphSepRef.current = true;
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {
      /* 舊瀏覽器可能不支援 */
    }
  };

  const handleBold = () => {
    document.execCommand('bold', false);
    flushToMarkdown();
  };

  const handleLink = () => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return;

    const existing = findAnchorInSelection(editor);
    if (existing) {
      editingLinkRef.current = existing;
      savedSelectionRef.current = null;
      setLinkDialogMode('edit');
      setLinkText(existing.textContent || '');
      setLinkUrl(existing.getAttribute('href') || '');
    } else {
      editingLinkRef.current = null;
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      setLinkDialogMode('create');
      setLinkText(sel.toString() || '連結文字');
      setLinkUrl('');
    }
    setShowLinkDialog(true);
  };

  const handleLinkConfirm = () => {
    if (!linkUrl.trim()) {
      toast.error('請輸入連結網址');
      return;
    }

    const existing = editingLinkRef.current;
    if (existing && editorRef.current?.contains(existing)) {
      existing.href = linkUrl.trim();
      existing.target = '_blank';
      existing.rel = 'noopener noreferrer';
      existing.style.cssText = LINK_STYLE;
      if (linkText.trim()) existing.textContent = linkText.trim();
    } else {
      const range = savedSelectionRef.current;
      if (!range) return;

      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      const a = document.createElement('a');
      a.href = linkUrl.trim();
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.cssText = LINK_STYLE;
      a.textContent = linkText.trim() || linkUrl;

      range.deleteContents();
      range.insertNode(a);
    }

    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
    savedSelectionRef.current = null;
    editingLinkRef.current = null;
    setLinkDialogMode('create');
    flushToMarkdown();
  };

  const handleRemoveLink = () => {
    const editor = editorRef.current;
    const a = editingLinkRef.current;
    if (!editor || !a || !editor.contains(a)) {
      setShowLinkDialog(false);
      return;
    }
    const parent = a.parentNode;
    if (!parent) return;
    while (a.firstChild) {
      parent.insertBefore(a.firstChild, a);
    }
    parent.removeChild(a);
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
    editingLinkRef.current = null;
    savedSelectionRef.current = null;
    setLinkDialogMode('create');
    flushToMarkdown();
  };

  const closeLinkDialog = () => {
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
    savedSelectionRef.current = null;
    editingLinkRef.current = null;
    setLinkDialogMode('create');
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const compressImage = (file: File, maxSizeMB: number = 5): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const max = 1920;
          if (width > max || height > max) {
            if (width > height) {
              height = (height / width) * max;
              width = max;
            } else {
              width = (width / height) * max;
              height = max;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('無法創建畫布'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          let q = 0.9;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('壓縮失敗'));
                  return;
                }
                if (blob.size <= maxSizeMB * 1024 * 1024 || q <= 0.1) {
                  resolve(new File([blob], file.name.replace(/[/\\]/g, '_'), { type: 'image/jpeg' }));
                } else {
                  q -= 0.1;
                  tryCompress();
                }
              },
              'image/jpeg',
              q
            );
          };
          tryCompress();
        };
        img.onerror = () => reject(new Error('無法載入圖片'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('讀取文件失敗'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片檔案');
      setIsUploading(false);
      return;
    }
    setIsUploading(true);
    try {
      let f = file;
      if (file.size > 5 * 1024 * 1024) {
        try {
          f = await compressImage(file, 5);
        } catch {
          toast.error('圖片壓縮失敗，請嘗試較小的圖片');
          setIsUploading(false);
          return;
        }
      }
      const ext = f.type === 'image/png' ? 'png' : f.type === 'image/gif' ? 'gif' : f.type === 'image/webp' ? 'webp' : 'jpg';
      const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const formData = new FormData();
      formData.append('file', new File([f], name, { type: f.type }));

      const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '上傳失敗' }));
        throw new Error(err.error || '上傳失敗');
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '上傳失敗');

      const editor = editorRef.current;
      if (!editor) return;

      const sel = window.getSelection();
      const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;

      const br1 = document.createElement('br');
      const img = document.createElement('img');
      img.src = data.url;
      img.alt = '';
      img.style.cssText = 'max-width: 100%; height: auto; display: block; margin: 0.5rem 0;';
      const br2 = document.createElement('br');

      if (range && editor.contains(range.commonAncestorContainer)) {
        range.insertNode(br2);
        range.insertNode(img);
        range.insertNode(br1);
        range.collapse(false);
      } else {
        editor.appendChild(br1);
        editor.appendChild(img);
        editor.appendChild(br2);
      }

      toast.success('圖片上傳成功');
      flushToMarkdown();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : '圖片上傳失敗');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    else setIsUploading(false);
    e.target.value = '';
  };

  /** 連結對話框「確定」主按鈕（淺紫底） */
  const pillPrimaryStyle = {
    backgroundColor: '#BAC7E5',
    color: '#5A5A5A',
    borderRadius: '9999px',
  } as const;
  /** 連結對話框「取消」外框按鈕 */
  const pillOutlineGrayStyle = {
    borderColor: '#5A5A5A',
    color: '#5A5A5A',
    borderRadius: '9999px',
    backgroundColor: 'transparent',
  } as const;
  const pillDestructiveStyle = {
    borderColor: '#ef4444',
    color: '#ef4444',
    borderRadius: '9999px',
    backgroundColor: 'transparent',
  } as const;

  return (
    <div className="w-full min-w-0 rounded-lg border border-gray-200 overflow-hidden">
      {/* 編輯區 - contentEditable + placeholder 用 grid 重疊 */}
      <div style={{ display: 'grid' }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={handleEditorFocus}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          data-placeholder={placeholder}
          className="simple-text-editor-ce w-full px-3 py-3 text-sm focus:outline-none bg-white [&>div]:min-h-[1.65em] [&>p]:min-h-[1.65em]"
          style={{
            gridArea: '1/1',
            minHeight: 200,
            color: '#374151',
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
        {!hasContent && (
          <div
            style={{
              gridArea: '1/1',
              padding: '12px',
              color: '#9ca3af',
              pointerEvents: 'none',
              fontSize: '14px',
              lineHeight: 1.75,
            }}
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* 工具列 - 置於編輯區下方 */}
      <div
        className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-t border-gray-200 bg-gray-50"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          className="h-9 min-w-9 p-2 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
          title="粗體"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLink}
          className="h-9 min-w-9 p-2 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
          title="連結（游標在連結內可編輯）"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageClick}
          disabled={isUploading}
          className="h-9 min-w-9 p-2 text-gray-700 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50"
          title="插入圖片"
        >
          {isUploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-gray-800" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 連結對話框 - 與捨棄變更對話框相同 Dialog / 按鈕配色 */}
      <Dialog
        open={showLinkDialog}
        onOpenChange={(open) => {
          if (!open) closeLinkDialog();
        }}
      >
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle style={{ color: '#5A5A5A' }}>
              {linkDialogMode === 'edit' ? '編輯連結' : '加入連結'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label style={{ color: '#5A5A5A' }}>顯示文字</Label>
              <Input
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="連結文字"
                className="mt-1.5 border-gray-300"
                style={{ color: '#5A5A5A' }}
              />
            </div>
            <div>
              <Label style={{ color: '#5A5A5A' }}>網址</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5 border-gray-300"
                style={{ color: '#5A5A5A' }}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row flex-wrap gap-2 justify-start items-stretch sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={closeLinkDialog}
              style={pillOutlineGrayStyle}
              className="hover:bg-gray-50 w-full sm:w-auto"
            >
              取消
            </Button>
            {linkDialogMode === 'edit' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoveLink}
                style={pillDestructiveStyle}
                className="hover:bg-gray-50 w-full sm:w-auto"
              >
                <Unlink className="h-4 w-4 mr-1 inline" />
                移除連結
              </Button>
            )}
            <Button
              type="button"
              onClick={handleLinkConfirm}
              style={pillPrimaryStyle}
              className="hover:bg-[#BAC7E5]/90 w-full sm:w-auto"
            >
              確定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
