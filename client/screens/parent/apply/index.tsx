import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { api } from '@/utils/api';
import { NavyButton, Field } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import Toast from 'react-native-toast-message';

export default function ApplyScreen() {
  const { token } = useAuth();
  const router = useSafeRouter();
  const [studentNo, setStudentNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [theme, setTheme] = useState('');
  const [taskId, setTaskId] = useState<number | null>(null);
  const [hasSubmission, setHasSubmission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scored, setScored] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const ov = await api.getOverview(token);
      setTaskId(ov?.task?.id ?? null);
      if (ov?.my_submission) {
        setHasSubmission(true);
        setTheme(ov.my_submission.theme || '');
        setStudentNo(ov.my_submission.student_no || '');
        setStudentName(ov.my_submission.student_name || '');
        setScored(!!ov.my_submission.scored_at);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '加载失败' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    if (taskId == null) return Toast.show({ type: 'error', text1: '当前没有进行中的任务' });
    if (!studentNo.trim() || !studentName.trim()) return Toast.show({ type: 'error', text1: '请填写孩子学号与姓名' });
    if (!theme.trim()) return Toast.show({ type: 'error', text1: '请填写展示主题' });

    setSubmitting(true);
    try {
      await api.applyTheme(token, taskId, {
        student_no: studentNo.trim(),
        student_name: studentName.trim(),
        theme: theme.trim(),
      });
      Toast.show({ type: 'success', text1: '申报成功！请等待课堂展示与打分' });
      setHasSubmission(true);
      router.replace('/parent');
    } catch (e: any) {
      // 后端会返回 "该主题已被申报，请更换主题"
      Toast.show({ type: 'error', text1: e?.message || '申报失败' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-cream">
        <StarryHeader
          title="主题申报"
          subtitle={hasSubmission ? '老师打分前可修改自己的主题' : '为孩子申报课前三分钟展示主题'}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="p-4">
          <View className="bg-white rounded-3xl p-5"
            style={{ shadowColor: '#1e3a5f', shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
            <Text className="text-[16px] font-bold text-navydark mb-1">孩子信息</Text>
            <Text className="text-[12px] text-ink-muted mb-4">学号姓名须与班级名单一致，仅能申报自己的孩子</Text>
            <Field label="孩子学号" value={studentNo} onChangeText={setStudentNo} keyboardType="number-pad" placeholder="如：2" editable={!scored} />
            <Field label="孩子姓名" value={studentName} onChangeText={setStudentName} placeholder="请输入孩子姓名" editable={!scored} />

            <Text className="text-[16px] font-bold text-navydark mb-1 mt-3">展示主题</Text>
            <Text className="text-[12px] text-ink-muted mb-4">主题在全班范围内不能重复，请尽量选择独特的角度</Text>
            <Field
              label="主题名称"
              value={theme}
              onChangeText={setTheme}
              editable={!scored}
              placeholder="如：我的航天梦 / 我最喜欢的一本书 …"
            />

            {scored ? (
              <View className="bg-[#fbf3dd] rounded-xl p-3 mb-4">
                <Text className="text-gold-dark text-[13px] font-medium">
                  ★ 老师已为此次申报打分，主题暂不可修改。
                </Text>
              </View>
            ) : null}

            <NavyButton
              title={hasSubmission ? '确认修改主题' : '提交申报'}
              onPress={submit}
              loading={submitting}
              disabled={!!scored}
            />
          </View>

          <TouchableOpacity className="items-center mt-5" onPress={() => router.push('/parent/records')}>
            <Text className="text-navydark text-[14px] font-medium">查看全班申报与得分 →</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </ScrollView>
    </Screen>
  );
}