import React, { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { api } from '@/utils/api';
import { Empty } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import { Star } from '@/components/stars/Star';
import Toast from 'react-native-toast-message';

interface Row {
  id: number;
  student_no: string;
  student_name: string;
  theme: string;
  content: number | null;
  expression: number | null;
  poise: number | null;
  total: number | null;
  best_star: boolean;
  scored_at: string | null;
}

export default function RecordsScreen() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [taskName, setTaskName] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const ov = await api.getOverview(token);
      if (ov?.task) {
        setTaskName(ov.task.name);
        const { submissions } = await api.getSubmissions(token, ov.task.id);
        setRows([...submissions].sort((a, b) => Number(a.student_no) - Number(b.student_no)));
      } else {
        setRows([]);
        setTaskName('');
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '加载失败' });
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <FlatList
        className="bg-cream"
        data={rows}
        keyExtractor={(r) => String(r.id)}
        ListHeaderComponent={
          <View>
            <StarryHeader title="全班记录" subtitle={taskName || '当前任务'} />
            <View className="px-4 pt-4">
              <Text className="text-ink-muted text-[13px] mb-3">
                ※ 说明：全班申报与得分仅可查看，不可修改。最佳课前三分钟以金色星标标识。
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={<View className="px-5"><Empty text="还没有同学的申报记录" /></View>}
        renderItem={({ item }) => (
          <View className="px-4 mb-3">
            <View className="bg-white rounded-2xl p-4"
              style={{ shadowColor: '#1e3a5f', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }}>
              <View className="flex-row items-center mb-2">
                <View className="w-9 h-9 rounded-full bg-[#e7edf5] items-center justify-center mr-3">
                  <Text className="text-navysoft text-[15px] font-bold">{(item.student_name || '?').slice(0, 1)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-ink text-[15px] font-semibold">{item.student_name || '未知同学'}</Text>
                  <Text className="text-ink-muted text-[12px]">学号 {item.student_no}</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-[12px] text-gold-dark mr-1">最佳</Text>
                  <Star filled={!!item.best_star} size={24} />
                </View>
              </View>
              <View className="bg-[#f7f4ee] rounded-xl px-3 py-2 mb-3">
                <Text className="text-[12px] text-ink-muted">申报主题</Text>
                <Text className="text-ink text-[14px] font-medium mt-0.5">{item.theme}</Text>
              </View>
              {item.scored_at ? (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row gap-3">
                    <Text className="text-ink-muted text-[12px]">内容 <Text className="text-navydark font-bold text-[15px]">{item.content ?? 0}</Text></Text>
                    <Text className="text-ink-muted text-[12px]">表达 <Text className="text-navydark font-bold text-[15px]">{item.expression ?? 0}</Text></Text>
                    <Text className="text-ink-muted text-[12px]">仪态 <Text className="text-navydark font-bold text-[15px]">{item.poise ?? 0}</Text></Text>
                  </View>
                  <Text className="text-[20px] font-bold text-gold-dark">{item.total ?? 0}<Text className="text-[12px] text-ink-muted"> /30</Text></Text>
                </View>
              ) : (
                <View className="bg-[#e7edf5] rounded-lg p-2.5 self-start">
                  <Text className="text-navysoft text-[12px]">待老师打分</Text>
                </View>
              )}
            </View>
          </View>
        )}
        ListFooterComponent={<View className="h-8" />}
      />
    </Screen>
  );
}