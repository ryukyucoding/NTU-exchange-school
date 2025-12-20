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
    async signIn({ user, account, profile }) {
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

            // 检查是否已有相同 email + 相同 provider 的帳號
            const { data: existingAccount, error: accountError } = await supabase
              .from('Account')
              .select('*, User(*)')
              .eq('provider', account.provider)
              .eq('providerAccountId', account.providerAccountId)
              .maybeSingle();

            // 如果查詢出錯且不是"找不到記錄"的錯誤，記錄並繼續
            if (accountError && accountError.code !== 'PGRST116') {
              console.error("Error checking existing account:", accountError);
            }

            // 如果這個 OAuth 帳號已存在，允許登入
            if (existingAccount) {
              return true;
            }

            // 如果是新帳號，檢查是否已有相同 email 的用戶
            const { data: existingUser, error: userError } = await supabase
              .from('User')
              .select('id')
              .eq('email', user.email)
              .maybeSingle();

            // 如果查詢出錯且不是"找不到記錄"的錯誤，記錄並繼續
            if (userError && userError.code !== 'PGRST116') {
              console.error("Error checking existing user:", userError);
            }

            if (existingUser) {
              // 如果用戶已存在，創建 Account 關聯
              const { error: insertError } = await supabase.from('Account').insert({
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
                console.error("Error creating account:", insertError);
                // 即使創建 Account 失敗，也允許登入（用戶已存在）
              }
            } else {
              // 創建新用戶
              const userId = crypto.randomUUID();
              // 生成唯一的 userID（使用 email 前綴，如果重複則加上隨機字串）
              let userID = user.email.split('@')[0] || userId.substring(0, 8);
              
              // 檢查 userID 是否已存在，如果存在則加上隨機字串
              const { data: existingUserID } = await supabase
                .from('User')
                .select('userID')
                .eq('userID', userID)
                .maybeSingle();
              
              if (existingUserID) {
                userID = `${userID}_${Math.random().toString(36).substring(2, 8)}`;
              }
              
              const now = new Date().toISOString();
              const { error: userInsertError } = await supabase.from('User').insert({
                id: userId,
                userID: userID,
                name: user.name || null,
                email: user.email,
                emailVerified: now,
                image: user.image || null,
                createdAt: now,
                updatedAt: now,
              });

              if (userInsertError) {
                console.error("Error creating user:", userInsertError);
                // 如果創建用戶失敗，仍然允許登入（NextAuth 會處理 session）
              } else {
                // 創建 Account 關聯
                const { error: accountInsertError } = await supabase.from('Account').insert({
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
                });

                if (accountInsertError) {
                  console.error("Error creating account:", accountInsertError);
                }
              }
            }

            return true;
          } catch (dbError) {
            // 如果資料庫操作失敗，記錄錯誤但允許登入
            console.error("Database operation error in signIn:", dbError);
            return true;
          }
      } catch (error) {
        console.error("SignIn callback error:", error);
        // 即使出錯，也允許登入（NextAuth 會處理基本的 session）
        return true;
      }
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub;
        (session.user as any).userID = (token as any).userID || null;
      }
      return session;
    },
    async jwt({ token, user }) {
      // 登入時（user 存在）把 userID 放進 token
      if (user?.id) {
        try {
          const supabase = getSupabaseServer();
          const { data: dbUser } = await supabase
            .from('User')
            .select('userID')
            .eq('id', user.id)
            .single();

          (token as any).userID = dbUser?.userID || null;
        } catch (error) {
          console.error("Error fetching userID in jwt callback:", error);
          (token as any).userID = null;
        }
      }
      return token;
    },
  },
});
