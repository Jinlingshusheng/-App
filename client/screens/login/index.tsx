import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { NavyButton, Field, Segment } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const router = useSafeRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<'teacher' | 'parent'>('teacher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Toast.show({ type: 'error', text1: '请输入账号和密码' });
      return;
    }
    setLoading(true);
    try {
      const u = await login(username.trim(), password);
      Toast.show({ type: 'success', text1: '登录成功' });
      if (u.role === 'teacher') router.replace('/teacher');
      else router.replace('/parent');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '登录失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-cream">
        <StarryHeader title="课前三分钟" subtitle="每一颗星，都值得在讲台上闪耀" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="px-5 pt-2 pb-10"
        >
          <View className="bg-white rounded-3xl p-6 mt-2 shadow-md"
            style={{ shadowColor: '#1e3a5f', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
            <Text className="text-[22px] font-bold text-navydark text-center mb-1">欢迎回来</Text>
            <Text className="text-[13px] text-ink-muted text-center mb-6">
              请选择身份登录「星辰中队」智慧平台
            </Text>

            <Segment
              options={[
                { key: 'teacher', label: '教师登录' },
                { key: 'parent', label: '家长登录' },
              ]}
              value={role}
              onChange={(k) => {
                setRole(k);
                setUsername('');
                setPassword('');
              }}
            />

            <Field
              label="账号"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="请输入账号"
            />
            <Field
              label="密码"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="请输入密码"
            />

            <NavyButton title="登 录" onPress={handleLogin} loading={loading} />

            {role === 'teacher' ? (
              <View className="items-center mt-4">
                <Text className="text-[12px] text-ink-muted">
                  教师初始账号 姓名拼音缩写，首次登录后请修改密码
                </Text>
              </View>
            ) : (
              <TouchableOpacity className="items-center mt-5" onPress={() => router.push('/register')}>
                <Text className="text-navydark text-[15px] font-semibold">
                  还没有账号？<Text className="text-gold-dark underline">注册并绑定孩子</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </Screen>
  );
}