import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { api } from '@/utils/api';
import { Segment, Empty } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import { Star } from '@/components/stars/Star';
import Toast from 'react-native-toast-message';

interface ScoreRow {
  id: number;
  student_no: string;
  student_name: string;
  theme: string;
  content: number;
  expression: number;
  poise: number;
  total: number;
  best_star: boolean;
  scored_at: string | null;
}

const DimKeys = [
  { key: 'content', label: '内容' },
  { key: 'expression', label: '表达' },
  { key: 'poise', label: '仪态' },
] as const;

function clamp(n: number) {
  return Math.max(0, Math.min(10, n));
}

function ScoreCard({
  row,
  saving,
  onSave,
}: {
  row: ScoreRow;
  saving: boolean;
  onSave: (r: ScoreRow) => void;
}) {
  const [content, setContent] = useState(row.content || 0);
  const [expression, setExpression] = useState(row.expression || 0);
  const [poise, setPoise] = useState(row.poise || 0);
  const [best, setBest] = useState(!!row.best_star);
  const total = content + expression + poise;

  const setScore = (key: 'content' | 'expression' | 'poise', val: number) => {
    const v = clamp(val);
    if (key === 'content') setContent(v);
    else if (key === 'expression') setExpression(v);
    else setPoise(v);
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-3"
      style={{ shadowColor: '#1e3a5f', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }}>
      <View className="flex-row items-center mb-2">
        <View className="w-8 h-8 rounded-full bg-[#e7edf5] items-center justify-center mr-2.5">
          <Text className="text-navysoft text-[14px] font-bold">{row.student_name.slice(0, 1)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-ink text-[15px] font-semibold">{row.student_name}</Text>
          <Text className="text-ink-muted text-[12px]">学号 {row.student_no}</Text>
        </View>
        <View className="items-center mr-1">
          <Text className="text-[11px] text-gold-dark font-semibold mb-0.5">最佳课前三分钟</Text>
          <Star size={30} filled={best} onPress={() => setBest(!best)} />
        </View>
      </View>

      <View className="bg-[#f7f4ee] rounded-xl px-3 py-2 mb-3">
        <Text className="text-[12px] text-ink-muted">申报主题</Text>
        <Text className="text-ink text-[14px] font-medium mt-0.5">{row.theme || '—'}</Text>
      </View>

      <View className="flex-row justify-between mb-3">
        {DimKeys.map((d) => (
          <View key={d.key} className="items-center flex-1">
            <Text className="text-[12px] text-ink-muted mb-1">{d.label}（1-10）</Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => setScore(d.key, (d.key === 'content' ? content : d.key === 'expression' ? expression : poise) - 1)}
                className="w-8 h-8 bg-[#e7edf5] rounded-full items-center justify-center"
              ><Text className="text-navysoft text-[18px] font-bold">−</Text></TouchableOpacity>
              <Text className="w-9 text-center text-[18px] font-bold text-navydark">
                {d.key === 'content' ? content : d.key === 'expression' ? expression : poise}
              </Text>
              <TouchableOpacity
                onPress={() => setScore(d.key, (d.key === 'content' ? content : d.key === 'expression' ? expression : poise) + 1)}
                className="w-8 h-8 bg-[#e7edf5] rounded-full items-center justify-center"
              ><Text className="text-navysoft text-[18px] font-bold">＋</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between pt-3 border-t border-[#eee8dc]">
        <Text className="text-ink-muted text-[13px]">
          总分 <Text className="text-[22px] font-bold text-gold-dark mx-1">{total}</Text>/30
        </Text>
        <TouchableOpacity
          onPress={() => onSave({ ...row, content, expression, poise, best_star: best, total })}
          disabled={saving}
          className={`${saving ? 'bg-[#9aa7bd]' : 'bg-navy'} rounded-full px-6 py-2.5`}
        >
          <Text className="text-white text-[14px] font-semibold">{saving ? '保存中…' : '保存打分'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ScoringScreen() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [sortBy, setSortBy] = useState<'no' | 'score'>('no');
  const [saving, setSaving] = useState<number | null>(null);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    try {
      const { tasks: list } = await api.getTasks(token);
      setTasks(list);
      const active = list.find((t) => t.is_active);
      setTaskId((cur) => cur ?? (active ? active.id : list[0]?.id ?? null));
    } catch { /* ignore */ }
  }, [token]);

  const loadRows = useCallback(async (tid: number) => {
    if (!token) return;
    try {
      const { submissions } = await api.getSubmissions(token, tid);
      setRows(submissions as ScoreRow[]);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '加载申报名单失败' });
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    loadTasks();
  }, [loadTasks]));

  useFocusEffect(useCallback(() => {
    if (taskId != null) loadRows(taskId);
  }, [taskId, loadRows]));

  const sorted = useMemo(() => {
    const arr = [...rows];
    if (sortBy === 'no') arr.sort((a, b) => Number(a.student_no) - Number(b.student_no));
    else arr.sort((a, b) => (b.total || 0) - (a.total || 0) || Number(a.student_no) - Number(b.student_no));
    return arr;
  }, [rows, sortBy]);

  const save = async (r: ScoreRow) => {
    setSaving(r.id);
    try {
      await api.scoreSubmission(token, r.id, { content: r.content, expression: r.expression, poise: r.poise, best_star: r.best_star });
      Toast.show({ type: 'success', text1: `${r.student_name} 打分已保存` });
      if (taskId != null) loadRows(taskId);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '保存失败' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen>
      <FlatList
        className="bg-cream"
        data={sorted}
        keyExtractor={(r) => String(r.id)}
        ListHeaderComponent={
          <View>
            <StarryHeader title="在线打分" subtitle="按学号顺序为已申报学生分维度打分，点亮最佳星标" />
            <View className="px-4 pt-4">
              {tasks.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  {tasks.map((t) => {
                    const active = t.id === taskId;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => { setTaskId(t.id); }}
                        className={`mr-2 px-4 py-2.5 rounded-2xl ${active ? 'bg-navy' : 'bg-white border border-navydark/20'}`}
                      >
                        <Text className={active ? 'text-white text-[13px] font-medium' : 'text-navydark text-[13px]'}>
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}

              {rows.length > 0 ? (
                <Segment
                  options={[
                    { key: 'no', label: '按学号' },
                    { key: 'score', label: '按总分' },
                  ]}
                  value={sortBy}
                  onChange={(k) => setSortBy(k)}
                />
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="px-5"><Empty text="暂无学生申报，请家长在家长端申报主题" /></View>
        }
        renderItem={({ item }) => (
          <View className="px-4">
            <ScoreCard row={item} saving={saving === item.id} onSave={save} />
          </View>
        )}
        ListFooterComponent={<View className="h-8" />}
      />
    </Screen>
  );
}