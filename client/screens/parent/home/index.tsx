import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { api } from '@/utils/api';
import { Card, Tag, Empty } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import { Star } from '@/components/stars/Star';
import Toast from 'react-native-toast-message';

export default function ParentHomeScreen() {
  const { token, user, logout } = useAuth();
  const router = useSafeRouter();
  const [ov, setOv] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const doLogout = async () => {
    await logout();
    router.replace('/');
  };

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getOverview(token);
      setOv(data);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '加载失败' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const task = ov?.task;
  const mine = ov?.my_submission;
  const count = ov?.submitted_count ?? 0;

  return (
    <Screen>
      <ScrollView className="flex-1 bg-cream">
        <StarryHeader
          title="课前三分钟智慧平台"
          subtitle={`家长您好：${user?.name || ''} · 孩子：${mine?.student_name || '待绑定'}`}
        />

        <View className="px-4 pt-3 flex-row justify-end">
          <TouchableOpacity
            onPress={doLogout}
            className="flex-row items-center bg-white border border-navydark/25 rounded-full px-4 py-2"
          >
            <Text className="text-[#c0392b] text-[13px] font-medium">退出登录</Text>
          </TouchableOpacity>
        </View>

        {!loading && task ? (
          <View className="p-4 -mt-6">
            <Card style={{ backgroundColor: '#ffffff' }}>
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-navydark text-[15px] font-bold">当前进行中的任务</Text>
                <Tag gold>进行中</Tag>
              </View>
              <Text className="text-ink text-[19px] font-bold mt-1">{task.name}</Text>
              {task.description ? <Text className="text-ink-muted text-[14px] mt-2">{task.description}</Text> : null}
              {task.requirement ? (
                <View className="bg-[#f7f4ee] rounded-xl p-3 mt-3">
                  <Text className="text-navydark text-[13px] font-semibold mb-1">要求说明</Text>
                  <Text className="text-ink text-[14px] leading-5">{task.requirement}</Text>
                </View>
              ) : null}
              <Text className="text-ink-muted text-[12px] mt-3">已有 {count} 名同学完成申报</Text>
            </Card>

            <Card style={{ backgroundColor: '#ffffff', marginTop: 14 }}>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-navydark text-[15px] font-bold">我的申报与得分</Text>
                {mine?.best_star ? <Tag gold>★ 最佳课前三分钟</Tag> : null}
              </View>

              {mine ? (
                <>
                  <View className="bg-[#f7f4ee] rounded-xl p-3.5 mb-3">
                    <Text className="text-[12px] text-ink-muted">展示主题</Text>
                    <Text className="text-ink text-[16px] font-semibold mt-0.5">{mine.theme}</Text>
                  </View>
                  {mine.scored_at ? (
                    <>
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-ink-muted text-[13px]">内容</Text>
                        <Text className="text-navydark text-[16px] font-bold">{mine.content ?? 0}</Text>
                      </View>
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-ink-muted text-[13px]">表达</Text>
                        <Text className="text-navydark text-[16px] font-bold">{mine.expression ?? 0}</Text>
                      </View>
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-ink-muted text-[13px]">仪态</Text>
                        <Text className="text-navydark text-[16px] font-bold">{mine.poise ?? 0}</Text>
                      </View>
                      <View className="flex-row items-center justify-between pt-3 border-t border-[#eee8dc]">
                        <Text className="text-ink-muted text-[13px]">总分</Text>
                        <Text className="text-[26px] font-bold text-gold-dark">{mine.total ?? 0}<Text className="text-[14px] text-ink-muted"> /30</Text></Text>
                      </View>
                    </>
                  ) : (
                    <View className="flex-row items-center gap-2 bg-[#e7edf5] rounded-xl p-3">
                      <Text className="text-navysoft text-[14px]">老师暂未打分，请耐心等待课堂展示</Text>
                    </View>
                  )}
                </>
              ) : (
                <Empty text="尚未申报展示主题" />
              )}
            </Card>

            <TouchableOpacity
              onPress={() => router.push('/parent/apply')}
              className="mt-4 bg-navy rounded-full py-3.5 items-center"
              style={{ shadowColor: '#1e3a5f', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }}
            >
              <Text className="text-white text-[15px] font-semibold">
                {mine ? '修改申报主题' : '去申报展示主题'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="p-4">
            <Empty text={loading ? '加载中…' : '当前暂无进行中的任务'} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}