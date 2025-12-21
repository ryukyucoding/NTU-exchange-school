'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Bold, Link, Plus, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { markdownToHtml, htmlToMarkdown } from '@/lib/utils';

interface SimpleRichTextEditorProps {
  value: string; // Markdown 格式
  onChange: (value: string) => void; // 回傳 Markdown 格式
  placeholder?: string;
}

export default function SimpleRichTextEditor({
  value,
  onChange,
  placeholder = '輸入內容...',
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const selectionStartMarkerRef = useRef<HTMLSpanElement>(null);
  const selectionEndMarkerRef = useRef<HTMLSpanElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [isComposing, setIsComposing] = useState(false); // 處理中文輸入
  const isUpdatingRef = useRef(false); // 標記是否正在從外部更新
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkDialogPosition, setLinkDialogPosition] = useState({ top: 0, left: 0 });
  const [hasContent, setHasContent] = useState(false);
  const [showPlusButton, setShowPlusButton] = useState(false);
  const [plusButtonPosition, setPlusButtonPosition] = useState({ top: 0, left: 0 });
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const plusButtonClickRangeRef = useRef<Range | null>(null); // 保存點擊"+"按鈕時的游標位置

  useEffect(() => {
    setMounted(true);
  }, []);

  // 將 Markdown 轉為 HTML 並更新編輯器內容
  const updateEditorContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // 如果編輯器正在被用戶編輯（有焦點），不要強制更新內容
    // 這可以避免在用戶輸入時內容被重置
    if (document.activeElement === editor && !isUpdatingRef.current) {
      return;
    }

    const html = markdownToHtml(value);
    
    // 只在內容真的改變時才更新，避免游標位置丟失
    // 使用正規化比較，忽略空白字符的差異
    const currentHtml = editor.innerHTML.replace(/\s+/g, ' ').trim();
    const newHtml = html.replace(/\s+/g, ' ').trim();
    
    if (currentHtml !== newHtml) {
      isUpdatingRef.current = true;
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      
      // 保存當前文字位置（相對於文字內容）
      let textOffset = 0;
      if (range && editor.contains(range.commonAncestorContainer)) {
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editor);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        textOffset = preCaretRange.toString().length;
      }
      
      editor.innerHTML = html || '<br>';
      
      // 恢復游標位置
      if (textOffset > 0 && editor.innerText.length > 0) {
        try {
          const walker = document.createTreeWalker(
            editor,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let currentOffset = 0;
          let targetNode: Node | null = null;
          let targetOffset = 0;
          
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeLength = node.textContent?.length || 0;
            
            if (currentOffset + nodeLength >= textOffset) {
              targetNode = node;
              targetOffset = textOffset - currentOffset;
              break;
            }
            
            currentOffset += nodeLength;
          }
          
          if (targetNode) {
            const newRange = document.createRange();
            newRange.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
            newRange.setEnd(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          }
        } catch (_e) {
          // 如果恢復失敗，將游標移到末尾
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      
      // 標記更新完成
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [value]);

  // 初始化時設置內容
  useEffect(() => {
    updateEditorContent();
    // 初始化時檢查是否有內容
    const editor = editorRef.current;
    if (editor) {
      const content = editor.innerText || editor.textContent || '';
      const hasText = content.trim().length > 0 || 
                      editor.innerHTML.replace(/<br\s*\/?>/gi, '').replace(/<[^>]+>/g, '').trim().length > 0;
      setHasContent(hasText);
    }
  }, [updateEditorContent]);

  // 同步編輯器樣式到測量層
  useEffect(() => {
    const editor = editorRef.current;
    const measureDiv = measureRef.current;
    
    if (!editor || !measureDiv) return;

    const syncStyles = () => {
      const computedStyle = window.getComputedStyle(editor);
      measureDiv.style.fontSize = computedStyle.fontSize;
      measureDiv.style.fontFamily = computedStyle.fontFamily;
      measureDiv.style.fontWeight = computedStyle.fontWeight;
      measureDiv.style.lineHeight = computedStyle.lineHeight;
      measureDiv.style.letterSpacing = computedStyle.letterSpacing;
      measureDiv.style.padding = computedStyle.padding;
      measureDiv.style.width = computedStyle.width;
      measureDiv.style.boxSizing = computedStyle.boxSizing;
      measureDiv.style.border = computedStyle.border;
    };

    syncStyles();
    window.addEventListener('resize', syncStyles);
    return () => window.removeEventListener('resize', syncStyles);
  }, [value]);

  // 處理編輯器內容變化
  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // 檢查是否有內容（包括注音輸入時）
    const content = editor.innerText || editor.textContent || '';
    const hasText = content.trim().length > 0 || 
                    editor.innerHTML.replace(/<br\s*\/?>/gi, '').replace(/<[^>]+>/g, '').trim().length > 0;
    setHasContent(hasText);

    if (isComposing || isUpdatingRef.current) return; // 中文輸入時或外部更新時不處理

    // 使用 setTimeout 來避免在更新過程中觸發
    setTimeout(() => {
      if (isUpdatingRef.current) return; // 再次檢查
      
      const html = editor.innerHTML;
      const markdown = htmlToMarkdown(html);
      
      // 只在真的改變時才更新，避免無限循環
      if (markdown !== value) {
        onChange(markdown);
      }
    }, 0);
  }, [isComposing, value, onChange]);

  // 處理中文輸入
  const handleCompositionStart = () => {
    setIsComposing(true);
    // 檢查是否有內容
    const editor = editorRef.current;
    if (editor) {
      const content = editor.innerText || editor.textContent || '';
      const hasText = content.trim().length > 0 || 
                      editor.innerHTML.replace(/<br\s*\/?>/gi, '').replace(/<[^>]+>/g, '').trim().length > 0;
      setHasContent(hasText);
    }
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
    handleInput();
  };

  const updateToolbarPosition = () => {
    const editor = editorRef.current;
    
    if (!editor) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (selectedText.length === 0 || range.collapsed) {
      setShowToolbar(false);
      return;
    }

    // 使用實際的選取範圍位置，而不是測量層
    // 創建一個臨時範圍來獲取選取區域的邊界
    const rects = range.getClientRects();
    
    if (rects.length === 0) {
      setShowToolbar(false);
      return;
    }

    // 如果選取跨越多行，使用第一個和最後一個矩形
    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];
    
    // 計算選取文字的中心位置
    const selectionCenterLeft = (firstRect.left + lastRect.right) / 2;
    const selectionTop = Math.min(firstRect.top, lastRect.top);
    const selectionBottom = Math.max(firstRect.bottom, lastRect.bottom);
    
    // 工具欄尺寸（改小一點）
    const toolbarWidth = 160;
    const toolbarHeight = 32;
    const spacing = 12; // 增加間距，讓工具欄更往上
    
    // 計算工具欄位置（往上移）
    let top = selectionTop - toolbarHeight - spacing;
    let left = selectionCenterLeft - toolbarWidth / 2;
    
    // 邊界處理
    left = Math.max(8, left);
    const maxLeft = window.innerWidth - toolbarWidth - 8;
    left = Math.min(left, maxLeft);
    
    if (top < 8) {
      top = selectionBottom + spacing;
    }
    
    setToolbarPosition({ top, left });
    setShowToolbar(true);
  };

  // 更新游標位置和「+」按鈕位置
  const updateCursorPosition = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement !== editor) {
      setShowPlusButton(false);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setShowPlusButton(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range.collapsed) {
      setShowPlusButton(false);
      return;
    }

    // 獲取游標位置的 Rect
    const rects = range.getClientRects();
    let cursorRect: DOMRect | null = rects.length > 0 ? rects[0] : null;

    if (!cursorRect) {
      try {
        cursorRect = range.getBoundingClientRect();
      } catch (_e) {
        // ignore
      }
    }

    // 偵測是否為空行
    try {
      let isLineEmpty = false;
      const container = range.startContainer;
      
      // 1. 如果容器是編輯器本身（通常是全空狀態）
      if (container === editor) {
        isLineEmpty = editor.textContent?.trim().length === 0;
      } 
      // 2. 如果容器是元素（如 <div><br></div>）
      else if (container.nodeType === Node.ELEMENT_NODE) {
        const element = container as Element;
        isLineEmpty = element.textContent?.trim().length === 0;
      }
      // 3. 如果容器是文字節點
      else if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent || '';
        // 檢查該文字節點所在的塊級元素
        const block = (container as Node).parentElement;
        if (block && block !== editor) {
          isLineEmpty = block.textContent?.trim().length === 0;
        } else {
          isLineEmpty = text.trim().length === 0;
        }
      }

      if (isLineEmpty) {
        const editorRect = editor.getBoundingClientRect();
        let buttonTop: number;

        if (cursorRect && cursorRect.height > 0) {
          buttonTop = cursorRect.top + (cursorRect.height / 2) - 12; // 居中對齊
        } else {
          // 備用方案：根據游標前的內容估算
          const preRange = range.cloneRange();
          preRange.selectNodeContents(editor);
          preRange.setEnd(range.startContainer, range.startOffset);
          const lineNumber = (preRange.toString().match(/\n/g) || []).length;
          const lineHeight = parseFloat(window.getComputedStyle(editor).lineHeight) || 24;
          buttonTop = editorRect.top + 8 + (lineNumber * lineHeight);
        }

        setPlusButtonPosition({
          top: buttonTop,
          left: editorRect.left - 32,
        });
        setShowPlusButton(true);
        return;
      }
    } catch (e) {
      console.error('Error in updateCursorPosition:', e instanceof Error ? e.message : String(e));
    }

    setShowPlusButton(false);
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = editorRef.current;
      if (!editor || document.activeElement !== editor) {
        setShowToolbar(false);
        setShowPlusButton(false);
        return;
      }
      
      requestAnimationFrame(() => {
        updateToolbarPosition();
        updateCursorPosition();
      });
    };

    const handleMouseMove = () => {
      const editor = editorRef.current;
      if (editor && document.activeElement === editor) {
        requestAnimationFrame(() => {
          updateCursorPosition();
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const editor = editorRef.current;
      if (editor && document.activeElement === editor) {
        // 如果按下 Backspace 或 Delete，且選中了圖片，確保它被正確移除
        if (e.key === 'Backspace' || e.key === 'Delete') {
          setTimeout(handleInput, 0);
        }
        
        requestAnimationFrame(() => {
          updateCursorPosition();
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 如果點擊的是圖片，選中它以便刪除
      if (target.tagName === 'IMG') {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNode(target);
        selection?.removeAllRanges();
        selection?.addRange(range);
        setShowPlusButton(false); // 點擊圖片時隱藏加號
      }
      handleSelectionChange();
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('mouseup', handleSelectionChange);
      editor.addEventListener('keyup', handleSelectionChange);
      editor.addEventListener('keydown', handleKeyDown);
      editor.addEventListener('mousemove', handleMouseMove);
      editor.addEventListener('click', handleClick);
      document.addEventListener('selectionchange', handleSelectionChange);
    }
    
    return () => {
      const editor = editorRef.current;
      if (editor) {
        editor.removeEventListener('mouseup', handleSelectionChange);
        editor.removeEventListener('keyup', handleSelectionChange);
        editor.removeEventListener('keydown', handleKeyDown);
        editor.removeEventListener('mousemove', handleMouseMove);
        editor.removeEventListener('click', handleClick);
      }
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [value, updateCursorPosition, handleInput]);

  // 獲取選取範圍用於測量層
  const getSelectionInfo = () => {
    const editor = editorRef.current;
    if (!editor) return { startText: '', selectedText: '', endText: '' };

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { startText: value, selectedText: '', endText: '' };
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    // 創建範圍來獲取選取前後的文字
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(editor);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const startText = beforeRange.toString();
    
    const afterRange = range.cloneRange();
    afterRange.selectNodeContents(editor);
    afterRange.setStart(range.endContainer, range.endOffset);
    const endText = afterRange.toString();

    return { startText, selectedText, endText };
  };

  const selectionInfo = getSelectionInfo();

  // 應用格式
  const applyFormat = (formatFn: () => void) => {
    const editor = editorRef.current;
    if (!editor) return;

    formatFn();
    
    // 更新 markdown（延遲執行，確保 DOM 已更新）
    setTimeout(() => {
      const html = editor.innerHTML;
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
    }, 0);
    
    setShowToolbar(false);
  };

  const handleBold = () => {
    applyFormat(() => {
      document.execCommand('bold', false);
    });
  };

  const handleFontSize = (size: string) => {
    applyFormat(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (!selectedText) return;

      // 創建對應的 HTML 標籤
      let tag = '';
      let closingTag = '';
      switch (size) {
        case 'h1': {
          tag = '<h1>';
          closingTag = '</h1>';
          break;
        }
        case 'h2': {
          tag = '<h2>';
          closingTag = '</h2>';
          break;
        }
        case 'h3': {
          tag = '<h3>';
          closingTag = '</h3>';
          break;
        }
        case 'small': {
          tag = '<small>';
          closingTag = '</small>';
          break;
        }
        case 'large': {
          tag = '<big>';
          closingTag = '</big>';
          break;
        }
        case 'normal': {
          // 正常大小不需要標籤，移除現有格式
          const span = document.createElement('span');
          span.textContent = selectedText;
          range.deleteContents();
          range.insertNode(span);
          return;
        }
        default:
          return;
      }

      // 刪除選取的文字並插入格式化的文字
      // 使用 span 而不是 div，避免換行
      range.deleteContents();
      const span = document.createElement('span');
      span.innerHTML = tag + selectedText + closingTag;
      range.insertNode(span);
    });
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString();
    // 保存選取範圍
    const range = selection.getRangeAt(0);
    savedSelectionRef.current = range.cloneRange();
    
    // 計算對話框位置（在選取文字下方）
    const rect = range.getBoundingClientRect();
    setLinkDialogPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });
    
    setLinkText(selectedText || '連結文字');
    setLinkUrl('');
    setShowLinkDialog(true);
    setShowToolbar(false);
  };

  const handleLinkConfirm = () => {
    if (!linkUrl.trim()) return;

    const selection = window.getSelection();
    const range = savedSelectionRef.current;
    
    if (!range) return;

    applyFormat(() => {
      // 恢復選取範圍
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      const link = document.createElement('a');
      link.href = linkUrl.trim();
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = linkText || '連結文字';
      link.style.color = '#3b82f6';
      link.style.textDecoration = 'underline';
      
      range.deleteContents();
      range.insertNode(link);
    });

    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
    savedSelectionRef.current = null;
  };

  // 壓縮圖片
  const compressImage = (file: File, maxSizeMB: number = 5): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 如果圖片太大，先縮小尺寸（最大寬度或高度為1920px）
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
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
          
          // 嘗試不同的質量，直到文件大小小於目標大小
          let quality = 0.9;
          const maxSizeBytes = maxSizeMB * 1024 * 1024;
          
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('壓縮失敗'));
                  return;
                }
                
                if (blob.size <= maxSizeBytes || quality <= 0.1) {
                  // 創建新的 File 對象
                  const compressedFile = new File(
                    [blob],
                    file.name.replace(/[/\\]/g, '_'), // 清理文件名
                    { type: 'image/jpeg' } // 統一轉換為 JPEG 以獲得更好的壓縮
                  );
                  resolve(compressedFile);
                } else {
                  quality -= 0.1;
                  tryCompress();
                }
              },
              'image/jpeg',
              quality
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

  // 處理圖片上傳
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片檔案');
      return;
    }

    setIsUploading(true);
    try {
      // 壓縮圖片（目標大小 5MB）
      let fileToUpload = file;
      if (file.size > 5 * 1024 * 1024) {
        try {
          fileToUpload = await compressImage(file, 5);
        } catch (compressError) {
          console.error('圖片壓縮失敗:', compressError);
          toast.error('圖片壓縮失敗，請嘗試較小的圖片');
          setIsUploading(false);
          return;
        }
      }
      
      // 生成一個安全的文件名（只包含字母數字和下劃線，完全避免斜杠等特殊字符）
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = fileToUpload.type === 'image/png' ? 'png' : 
                       fileToUpload.type === 'image/gif' ? 'gif' : 
                       fileToUpload.type === 'image/webp' ? 'webp' : 'jpg';
      const safeFileName = `img_${timestamp}_${randomStr}.${extension}`;
      
      // 創建新的 File 對象，使用安全的文件名
      const cleanFile = new File(
        [fileToUpload],
        safeFileName,
        { type: fileToUpload.type }
      );
      
      const formData = new FormData();
      formData.append('file', cleanFile);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '上傳失敗' }));
        throw new Error(errorData.error || '上傳失敗');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '上傳失敗');
      }

      // 插入圖片到編輯器
      const editor = editorRef.current;
      if (!editor) {
        toast.error('編輯器未找到');
        return;
      }

      const selection = window.getSelection();
      if (!selection) {
        toast.error('無法獲取選擇範圍');
        return;
      }

      // 使用保存的游標位置（點擊"+"按鈕時的位置），如果沒有則使用當前位置
      let range: Range;
      if (plusButtonClickRangeRef.current) {
        range = plusButtonClickRangeRef.current;
        // 確保範圍仍然有效
        try {
          void range.startContainer;
        } catch (_e) {
          // 如果範圍無效，使用當前位置
          if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
          } else {
            // 如果沒有選擇，創建一個新的範圍在編輯器末尾
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
          }
        }
      } else if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // 如果沒有選擇，創建一個新的範圍在編輯器末尾
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      
      applyFormat(() => {
        const img = document.createElement('img');
        img.src = data.url;
        img.alt = '';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '1rem auto'; // 居中顯示
        img.style.cursor = 'pointer';
        
        // 在游標位置插入圖片
        range.insertNode(img);
        
        // 在圖片後插入一個空行，方便繼續輸入
        const br = document.createElement('br');
        const p = document.createElement('p');
        p.appendChild(br);
        img.after(p);
        
        // 將游標移到新行
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      });

      // 更新內容
      const html = editor.innerHTML;
      const markdown = htmlToMarkdown(html);
      onChange(markdown);

      toast.success('圖片上傳成功');
      setShowImageMenu(false);
      plusButtonClickRangeRef.current = null; // 清除保存的位置
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : '圖片上傳失敗');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // 重置 input，允許重複選擇同一檔案
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg overflow-hidden relative bg-white">
      {/* Editor - contentEditable div */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onClick={() => {
          // 點擊編輯器時更新游標位置
          requestAnimationFrame(() => {
            updateCursorPosition();
          });
        }}
        onBlur={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (relatedTarget && relatedTarget.closest('.floating-toolbar')) {
            return;
          }
          setTimeout(() => {
            setShowToolbar(false);
            setShowPlusButton(false);
            setShowImageMenu(false);
          }, 200);
        }}
        className="min-h-[300px] resize-none border-0 focus:ring-0 bg-white px-3 py-2 text-sm"
        style={{ 
          color: '#5A5A5A',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          lineHeight: '1.75', // 增加行距
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      {/* Placeholder */}
      {!hasContent && (
        <div
          className="absolute top-2 left-3 pointer-events-none text-muted-foreground text-sm"
          style={{ color: '#9ca3af' }}
        >
          {placeholder}
        </div>
      )}
      
      {/* 隱藏的測量層 - 用於精確定位選取文字 */}
      <div
        ref={measureRef}
        className="absolute inset-0 pointer-events-none invisible overflow-hidden"
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          padding: '0.5rem 0.75rem',
          fontSize: '0.875rem',
          lineHeight: '1.75', // 與編輯器保持一致的行距
          fontFamily: 'inherit',
          color: 'transparent',
        }}
      >
        {selectionInfo.startText}
        <span ref={selectionStartMarkerRef}>\u200b</span>
        {selectionInfo.selectedText}
        <span ref={selectionEndMarkerRef}>\u200b</span>
        {selectionInfo.endText}
      </div>
      
      {/* Floating Toolbar */}
      {mounted && showToolbar && createPortal(
        <div
          className="floating-toolbar fixed flex items-center gap-0.5 p-1.5 rounded-lg shadow-lg"
          style={{
            backgroundColor: '#5A5A5A',
            zIndex: 9999,
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBold}
            className="h-7 w-7 p-0 hover:bg-gray-600"
          >
            <Bold className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
          </Button>
          
          {/* 字體大小按鈕 - 三個不同大小的 T（從大到小） */}
          <div className="flex items-center gap-0.5 border-l border-gray-500 pl-1 ml-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFontSize('large')}
              className="h-7 w-7 p-0 hover:bg-gray-600"
              title="大字"
            >
              <span className="text-base" style={{ color: '#ffffff', fontSize: '16px' }}>T</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFontSize('normal')}
              className="h-7 w-7 p-0 hover:bg-gray-600"
              title="正常"
            >
              <span className="text-sm" style={{ color: '#ffffff', fontSize: '14px' }}>T</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFontSize('small')}
              className="h-7 w-7 p-0 hover:bg-gray-600"
              title="小字"
            >
              <span className="text-xs" style={{ color: '#ffffff', fontSize: '12px' }}>T</span>
            </Button>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLink}
            className="h-7 w-7 p-0 hover:bg-gray-600"
          >
            <Link className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
          </Button>
        </div>,
        document.body
      )}
      
      {/* 「+」按鈕 - 顯示在游標所在行前 */}
      {mounted && showPlusButton && createPortal(
        <>
          {/* 背景遮罩 - 點擊外部區域關閉菜單 */}
          {showImageMenu && (
            <div
              className="fixed inset-0 z-[10000]"
              style={{ backgroundColor: 'transparent' }}
              onClick={() => {
                setShowImageMenu(false);
              }}
            />
          )}
          <div
            className="fixed z-[10001]"
            style={{
              top: `${plusButtonPosition.top}px`,
              left: `${plusButtonPosition.left}px`,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                // 保存當前游標位置
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  plusButtonClickRangeRef.current = selection.getRangeAt(0).cloneRange();
                }
                setShowImageMenu(!showImageMenu);
              }}
              className="h-6 w-6 p-0 rounded-full bg-white border border-gray-300 shadow-sm hover:bg-gray-50 flex items-center justify-center"
              style={{ minWidth: '24px', minHeight: '24px' }}
            >
              <Plus className="h-3.5 w-3.5" style={{ color: '#5A5A5A' }} />
            </Button>
            
            {/* 圖片菜單 - 圓形圖標並水平對齊 */}
            {showImageMenu && (
              <div
                className="absolute left-7 top-0 flex items-center h-6 z-[10002]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="h-6 w-6 p-0 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 flex items-center justify-center ml-1"
                  title="上傳圖片"
                >
                  {isUploading ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5" style={{ color: '#5A5A5A' }} />
                  )}
                </Button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
      
      {/* 連結輸入框 - 浮動在文字下方 */}
      {showLinkDialog && createPortal(
        <>
          {/* 背景遮罩 - 點擊外部區域關閉 */}
          <div
            className="fixed inset-0 z-[9999]"
            style={{ backgroundColor: 'transparent' }}
            onClick={() => {
              setShowLinkDialog(false);
              setLinkUrl('');
              setLinkText('');
              savedSelectionRef.current = null;
            }}
          />
          {/* 對話框內容 */}
          <div
            className="fixed rounded-lg shadow-lg border border-gray-200 p-3 z-[10000]"
            style={{
              backgroundColor: '#ffffff',
              top: `${linkDialogPosition.top}px`,
              left: `${linkDialogPosition.left}px`,
              minWidth: '300px',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="link-text" style={{ color: '#5A5A5A', fontSize: '14px', fontWeight: 500 }}>
                連結文字
              </Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="連結文字"
                style={{ color: '#5A5A5A' }}
                className="border-gray-300"
                onKeyDown={(e) => {
                  // 移除 Enter 鍵確認功能，必須按確認按鈕
                  if (e.key === 'Escape') {
                    setShowLinkDialog(false);
                    setLinkUrl('');
                    setLinkText('');
                    savedSelectionRef.current = null;
                  }
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="link-url" style={{ color: '#5A5A5A', fontSize: '14px', fontWeight: 500 }}>
                連結網址
              </Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                style={{ color: '#5A5A5A' }}
                className="border-gray-300"
                onKeyDown={(e) => {
                  // 移除 Enter 鍵確認功能，必須按確認按鈕
                  if (e.key === 'Escape') {
                    setShowLinkDialog(false);
                    setLinkUrl('');
                    setLinkText('');
                    savedSelectionRef.current = null;
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkText('');
                  savedSelectionRef.current = null;
                }}
                style={{ 
                  color: '#5A5A5A',
                  borderColor: '#5A5A5A',
                  backgroundColor: 'transparent',
                }}
                className="hover:bg-gray-50"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleLinkConfirm}
                disabled={!linkUrl.trim()}
                style={{ 
                  backgroundColor: '#8D7051',
                  color: '#ffffff',
                }}
                className="hover:opacity-90"
              >
                確認
              </Button>
            </div>
          </div>
        </div>
        </>,
        document.body
      )}
    </div>
  );
}
