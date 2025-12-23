'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('登入失敗：用戶名或密碼錯誤');
      } else if (result?.ok) {
        toast.success('登入成功！');
        router.push('/social');
      }
    } catch (error) {
      toast.error('登入過程中發生錯誤');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center">
      <Card className="p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#5A5A5A]">管理員登入</h1>
          <p className="text-gray-600 mt-2">登入到心得小幫手帳號</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              用戶名
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="輸入管理員用戶名"
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密碼
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="輸入管理員密碼"
              required
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            style={{
              backgroundColor: '#BAC7E5',
              color: '#5A5A5A',
              borderRadius: '9999px',
            }}
          >
            {isLoading ? '登入中...' : '登入'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full"
            style={{
              borderColor: '#5A5A5A',
              color: '#5A5A5A',
              borderRadius: '9999px',
            }}
          >
            返回首頁
          </Button>
        </div>
      </Card>
    </div>
  );
}
