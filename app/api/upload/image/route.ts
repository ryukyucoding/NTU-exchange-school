import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '沒有上傳檔案' },
        { status: 400 }
      );
    }

    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '檔案必須是圖片格式' },
        { status: 400 }
      );
    }

    // 移除檔案大小限制，因為會在客戶端壓縮

    // 檢查必要的環境變數
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error('Missing Cloudinary config:', { cloudName: !!cloudName, uploadPreset: !!uploadPreset });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cloudinary 配置缺失。請在 .env.local 中設置 NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 和 CLOUDINARY_UPLOAD_PRESET。詳見 docs/CLOUDINARY_SETUP.md' 
        },
        { status: 500 }
      );
    }

    // 上傳到 Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    // 轉換為 base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    
    // 確定圖片格式（確保是有效的格式）
    let imageType = file.type || 'image/jpeg';
    if (!imageType.startsWith('image/')) {
      imageType = 'image/jpeg';
    }
    
    // 創建 data URI
    const dataUri = `data:${imageType};base64,${base64}`;
    
    // 生成一個安全的文件名（只包含字母數字和下劃線）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const safeFilename = `img_${timestamp}_${randomStr}`;
    
    // 使用 URLSearchParams
    const uploadFormData = new URLSearchParams();
    uploadFormData.append('file', dataUri);
    uploadFormData.append('upload_preset', uploadPreset);
    // 使用 filename_override 參數來設置一個不含斜線的文件名
    uploadFormData.append('filename_override', safeFilename);

    const cloudinaryResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: uploadFormData.toString(),
    });

    if (!cloudinaryResponse.ok) {
      let errorMessage = '圖片上傳失敗';
      try {
        const error = await cloudinaryResponse.json();
        console.error('Cloudinary upload error:', error);
        errorMessage = error.error?.message || error.message || '圖片上傳失敗';
      } catch (e) {
        const errorText = await cloudinaryResponse.text();
        console.error('Cloudinary upload error (text):', errorText);
        errorMessage = errorText || '圖片上傳失敗';
      }
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    const result = await cloudinaryResponse.json();

    if (!result.secure_url) {
      console.error('Cloudinary response missing secure_url:', result);
      return NextResponse.json(
        { success: false, error: '上傳成功但無法獲取圖片網址' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '上傳過程中發生錯誤' },
      { status: 500 }
    );
  }
}

