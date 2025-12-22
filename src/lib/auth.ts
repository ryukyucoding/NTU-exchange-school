/**
 * NextAuth configuration
 * 使用 Google OAuth 登入
 */

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getSupabaseServer } from "./db";

// 检查环境变量
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("⚠️  警告：未設定 Google OAuth 憑證！請在 .env.local 中設定 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (!account || !user.email) {
          console.error("Missing account or user email");
          return false;
        }

        // 暫時簡化：如果沒有 Supabase 配置，直接允許登入
        // 之後可以再完善資料庫整合
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          console.warn("⚠️  Supabase 未配置，跳過資料庫操作，允許登入");
          return true;
        }

          try {
            const supabase = getSupabaseServer();
            console.log("🔍 [signIn] 開始檢查用戶資料，email:", user.email);

            // 检查是否已有相同 email + 相同 provider 的帳號
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existingAccount, error: accountError } = await (supabase as any)
              .from('Account')
              .select('*, User(*)')
              .eq('provider', account.provider)
              .eq('providerAccountId', account.providerAccountId)
              .maybeSingle();

            // 如果查詢出錯且不是"找不到記錄"的錯誤，記錄並繼續
            if (accountError && accountError.code !== 'PGRST116') {
              console.error("❌ [signIn] Error checking existing account:", accountError);
            }

            // 如果這個 OAuth 帳號已存在，允許登入
            if (existingAccount) {
              console.log("✅ [signIn] 找到現有帳號，允許登入");
              console.log("📋 [signIn] existingAccount 結構:", JSON.stringify({
                accountId: existingAccount.id,
                userId: existingAccount.userId,
                hasUser: !!existingAccount.User,
                userFromAccount: existingAccount.User?.id || null,
              }, null, 2));
              
              // 重要：設置 user.id 為資料庫中的 User.id，確保 NextAuth 使用正確的 ID
              // 優先使用 existingAccount.User.id，如果沒有則使用 existingAccount.userId
              const dbUserId = existingAccount.User?.id || existingAccount.userId;
              if (dbUserId) {
                user.id = dbUserId;
                console.log("🔑 [signIn] 設置 user.id 為:", user.id);
              } else {
                console.error("❌ [signIn] 無法從 existingAccount 獲取 userId");
              }
              return true;
            }

            // 如果是新帳號，檢查是否已有相同 email 的用戶
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: existingUser, error: userError } = await (supabase as any)
              .from('User')
              .select('id')
              .eq('email', user.email)
              .maybeSingle();

            // 如果查詢出錯且不是"找不到記錄"的錯誤，記錄並繼續
            if (userError && userError.code !== 'PGRST116') {
              console.error("❌ [signIn] Error checking existing user:", userError);
            }

        if (existingUser) {
          console.log("👤 [signIn] 找到現有用戶，創建 Account 關聯");
          // 重要：將 existingUser.id 設置到 user.id，確保 NextAuth 使用正確的 ID
          user.id = existingUser.id;
          
          // 如果用戶已存在，創建 Account 關聯
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertError } = await (supabase as any).from('Account').insert({
            id: crypto.randomUUID(),
            userId: existingUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
          });

          if (insertError) {
            console.error("❌ [signIn] Error creating account:", insertError);
            // 即使創建 Account 失敗，也允許登入（用戶已存在）
          } else {
            console.log("✅ [signIn] Account 關聯創建成功");
          }
        } else {
              console.log("🆕 [signIn] 創建新用戶");
              // 創建新用戶
              const userId = crypto.randomUUID();
              // 生成唯一的 userID（使用 email 前綴，如果重複則加上隨機字串）
              let userID = user.email.split('@')[0] || userId.substring(0, 8);
              
              // 檢查 userID 是否已存在，如果存在則加上隨機字串
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: existingUserID } = await (supabase as any)
                .from('User')
                .select('userID')
                .eq('userID', userID)
                .maybeSingle();
              
              if (existingUserID) {
                userID = `${userID}_${Math.random().toString(36).substring(2, 8)}`;
              }
              
              const now = new Date().toISOString();
              const userData = {
                id: userId,
                userID: userID,
                name: user.name || null,
                email: user.email,
                emailVerified: now,
                image: user.image || null,
                createdAt: now,
                updatedAt: now,
              };
              
              console.log("📝 [signIn] 準備插入用戶資料:", { ...userData, email: user.email });
              
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: insertedUser, error: userInsertError } = await (supabase as any)
                .from('User')
                .insert(userData)
                .select()
                .single();

              if (userInsertError) {
                console.error("❌ [signIn] Error creating user:", userInsertError);
                console.error("❌ [signIn] 錯誤詳情:", JSON.stringify(userInsertError, null, 2));
                // 如果創建用戶失敗，仍然允許登入（NextAuth 會處理 session）
              } else {
                console.log("✅ [signIn] 用戶創建成功:", insertedUser?.id);
                // 重要：將 userId 設置到 user.id，這樣 NextAuth 會使用這個 ID
                user.id = userId;
                
                // 創建 Account 關聯
                const accountData = {
                  id: crypto.randomUUID(),
                  userId: userId,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                };
                
                console.log("📝 [signIn] 準備插入 Account 資料");
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: accountInsertError } = await (supabase as any).from('Account').insert(accountData);

                if (accountInsertError) {
                  console.error("❌ [signIn] Error creating account:", accountInsertError);
                  console.error("❌ [signIn] 錯誤詳情:", JSON.stringify(accountInsertError, null, 2));
                } else {
                  console.log("✅ [signIn] Account 創建成功");
                }
              }
            }

            return true;
          } catch (dbError) {
            // 如果資料庫操作失敗，記錄錯誤但允許登入
            console.error("❌ [signIn] Database operation error:", dbError);
            console.error("❌ [signIn] 錯誤堆疊:", dbError instanceof Error ? dbError.stack : String(dbError));
            return true;
          }
      } catch (error) {
        console.error("SignIn callback error:", error instanceof Error ? error.message : String(error));
        // 即使出錯，也允許登入（NextAuth 會處理基本的 session）
        return true;
      }
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub;
        (session.user as { userID?: string | null }).userID = (token as { userID?: string | null }).userID || null;
      }
      return session;
    },
    async jwt({ token, user }) {
      // 登入時（user 存在）設置 token.sub 為 user.id，並從資料庫獲取 userID
      if (user?.id) {
        token.sub = user.id; // 確保 token.sub 是資料庫中的 User.id
        
        try {
          const supabase = getSupabaseServer();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: dbUser } = await (supabase as any)
            .from('User')
            .select('userID')
            .eq('id', user.id)
            .maybeSingle();

          (token as { userID?: string | null }).userID = dbUser?.userID || null;
        } catch (error) {
          console.error("Error fetching userID in jwt callback:", error instanceof Error ? error.message : String(error));
          (token as { userID?: string | null }).userID = null;
        }
      }
      return token;
    },
  },
});
