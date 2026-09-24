import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { api } from '@/utils/api';
import { NavyButton, Field, Empty, Tag } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import Toast from 'react-native-toast-message';

interface Task {
  id: number;
  name: string;
  description: string | null;
  requirement: string | null;
  is_active: boolean;
  created_at: string;
}

export default function TasksScreen() {
  const { token } = useAuth();
  const router = useSafeRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fReq, setFReq] = useState('');
  const [fActive, setFActive] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { tasks: list } = await api.getTasks(token);
      setTasks([...list].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0) || b.id - a.id));
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '加载任务失败' });
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = () => {
    setEditing(null);
    setFName('');
    setFDesc('');
    setFReq('');
    setFActive(true);
    setModalVisible(true);
  };
  const openEdit = (t: Task) => {
    setEditing(t);
    setFName(t.name);
    setFDesc(t.description || '');
    setFReq(t.requirement || '');
    setFActive(!!t.is_active);
    setModalVisible(true);
  };

  const save = async () => {
    if (!fName.trim()) return Toast.show({ type: 'error', text1: '请填写任务名称' });
    setLoading(true);
    try {
      if (editing) {
        await api.updateTask(token, editing.id, { name: fName.trim(), description: fDesc.trim(), requirement: fReq.trim(), is_active: fActive });
      } else {
        await api.createTask(token, { name: fName.trim(), description: fDesc.trim(), requirement: fReq.trim(), is_active: fActive });
      }
      Toast.show({ type: 'success', text1: '保存成功' });
      setModalVisible(false);
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '保存失败' });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (t: Task, v: boolean) => {
    try {
      await api.updateTask(token, t.id, { is_active: v });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '更新失败' });
    }
  };

  const remove = async (t: Task) => {
    try {
      await api.deleteTask(token, t.id);
      Toast.show({ type: 'success', text1: '已删除任务' });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '删除失败' });
    }
  };

  return (
    <Screen>
      <FlatList
        className="bg-cream"
        data={tasks}
        keyExtractor={(t) => String(t.id)}
        ListHeaderComponent={
          <View>
            <StarryHeader title="任务发布" subtitle="创建学期展示任务，家长将看到当前进行中的任务" />
            <View className="px-4 pt-4">
              <TouchableOpacity
                onPress={() => router.push('/teacher/scoring')}
                className="bg-[#fbf3dd] border border-gold-dark/40 rounded-2xl px-4 py-3 mb-4"
              >
                <Text className="text-gold-dark text-[13px] font-semibold text-center">★ 前往在线打分</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={<View className="px-5"><Empty text="暂无任务，点击下方按钮创建" /></View>}
        renderItem={({ item }) => (
          <View className="px-4 mb-3">
            <View className="bg-white rounded-2xl p-4"
              style={{ shadowColor: '#1e3a5f', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }}>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-ink text-[16px] font-bold flex-1 mr-2">{item.name}</Text>
                {item.is_active ? <Tag gold>进行中</Tag> : <Tag>已结束</Tag>}
              </View>
              {item.description ? <Text className="text-ink-muted text-[13px] mt-1">{item.description}</Text> : null}
              {item.requirement ? (
                <Text className="text-ink text-[13px] mt-1.5 bg-[#f7f4ee] rounded-xl p-2.5">
                  <Text className="font-semibold text-navydark">要求：</Text>{item.requirement}
                </Text>
              ) : null}
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#eee8dc]">
                <View className="flex-row items-center">
                  <Text className="text-[13px] text-ink-muted mr-2">设为进行中</Text>
                  <Switch value={!!item.is_active} onValueChange={(v) => toggleActive(item, v)}
                    trackColor={{ true: '#1e3a5f' }} thumbColor="#fff" />
                </View>
                <View className="flex-row">
                  <TouchableOpacity onPress={() => openEdit(item)} className="px-3 py-1.5"><Text className="text-navydark text-[14px]">编辑</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item)} className="px-3 py-1.5"><Text className="text-[#c0392b] text-[14px]">删除</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View className="px-4 pb-8">
            <NavyButton title="＋ 创建新任务" onPress={openNew} loading={loading} />
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
          <TouchableOpacity className="flex-1 bg-black/30" onPress={() => setModalVisible(false)} />
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <Text className="text-[18px] font-bold text-navydark mb-4">{editing ? '编辑任务' : '创建任务'}</Text>
            <Field label="任务名称" value={fName} onChangeText={setFName} placeholder="如：2026年秋季学期课前三分钟" />
            <Field label="任务说明（可选）" value={fDesc} onChangeText={setFDesc} multiline placeholder="简要说明本期展示安排" />
            <Field label="要求说明（可选）" value={fReq} onChangeText={setFReq} multiline placeholder="主题要求、时长、注意事项等" />
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[14px] text-ink">设为「进行中」（家长端展示）</Text>
              <Switch value={fActive} onValueChange={setFActive} trackColor={{ true: '#1e3a5f' }} thumbColor="#fff" />
            </View>
            <NavyButton title="保存" onPress={save} loading={loading} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}