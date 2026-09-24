import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { NavyButton, Field } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import Toast from 'react-native-toast-message';

export default function RegisterScreen() {
  const router = useSafeRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !password) return Toast.show({ type: 'error', text1: '请填写账号与密码' });
    if (!/^(?=.*[a-z0-9])[a-z0-9]{6,20}$/i.test(username)) {
      return Toast.show({ type: 'error', text1: '账号需为6-20位字母或数字' });
    }
    if (!/^[a-z0-9]{8,20}$/i.test(password)) {
      return Toast.show({ type: 'error', text1: '密码需为8位以上字母或数字' });
    }
    if (!name) return Toast.show({ type: 'error', text1: '请填写家长称呼' });
    if (!studentNo || !studentName) return Toast.show({ type: 'error', text1: '请填写孩子学号与姓名' });

    setLoading(true);
    try {
      await register({
        username: username.trim(),
        password,
        name: name.trim(),
        student_no: studentNo.trim(),
        student_name: studentName.trim(),
      });
      Toast.show({ type: 'success', text1: '注册成功，已绑定孩子' });
      router.replace('/parent');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '注册失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-cream">
        <StarryHeader title="注册并绑定孩子" subtitle="请填写孩子学号姓名，与班级名单匹配后完成绑定" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="px-5 pt-2 pb-10"
        >
          <View className="bg-white rounded-3xl p-6 mt-2"
            style={{ shadowColor: '#1e3a5f', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
            <Text className="text-[18px] font-bold text-navydark mb-4">账号信息</Text>
            <Field label="账号" value={username} onChangeText={setUsername} autoCapitalize="none"
              placeholder="6-20位字母或数字" hint="由您自己设定" />
            <Field label="密码" value={password} onChangeText={setPassword} secureTextEntry
              placeholder="8位以上字母或数字" hint="务必牢记，用于以后登录" />
            <Field label="家长称呼" value={name} onChangeText={setName} placeholder="如：李小红妈妈" />

            <Text className="text-[18px] font-bold text-navydark mb-1 mt-4">绑定孩子</Text>
            <Text className="text-[12px] text-ink-muted mb-4">
              孩子必须是老师已导入名单中的学生，学号姓名须与名单完全一致
            </Text>
            <Field label="孩子学号" value={studentNo} onChangeText={setStudentNo} placeholder="如：2" keyboardType="number-pad" />
            <Field label="孩子姓名" value={studentName} onChangeText={setStudentName} placeholder="请输入孩子姓名" />

            <NavyButton title="注册并绑定" onPress={handleRegister} loading={loading} />

            <View className="items-center mt-4">
              <Text className="text-navydark text-[14px] font-medium">
                已有账号？<Text className="text-gold-dark" onPress={() => router.back()}>返回登录</Text>
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </Screen>
  );
}