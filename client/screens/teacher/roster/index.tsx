import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { api } from '@/utils/api';
import { createFormDataFile } from '@/utils';
import { NavyButton, Field, Empty } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import Toast from 'react-native-toast-message';

interface Student {
  id: number;
  student_no: string;
  name: string;
  created_at: string;
}

export default function RosterScreen() {
  const { token } = useAuth();
  const router = useSafeRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // 编辑/新增弹窗
  const [editVisible, setEditVisible] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [edNo, setEdNo] = useState('');
  const [edName, setEdName] = useState('');

  // 粘贴文本弹窗
  const [pasteVisible, setPasteVisible] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { students: list } = await api.getStudents(token);
      const sorted = [...list].sort(
        (a, b) => Number(a.student_no) - Number(b.student_no) || a.student_no.localeCompare(b.student_no)
      );
      setStudents(sorted);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '加载名单失败' });
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openAdd = () => {
    setEditing(null);
    setEdNo('');
    setEdName('');
    setEditVisible(true);
  };
  const openEdit = (s: Student) => {
    setEditing(s);
    setEdNo(s.student_no);
    setEdName(s.name);
    setEditVisible(true);
  };

  const saveStudent = async () => {
    if (!edNo.trim() || !edName.trim()) {
      return Toast.show({ type: 'error', text1: '请填写学号和姓名' });
    }
    setLoading(true);
    try {
      if (editing) await api.updateStudent(token, editing.id, { student_no: edNo.trim(), name: edName.trim() });
      else await api.addStudent(token, { student_no: edNo.trim(), name: edName.trim() });
      Toast.show({ type: 'success', text1: '保存成功' });
      setEditVisible(false);
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '保存失败' });
    } finally {
      setLoading(false);
    }
  };

  const removeStudent = async (id: number) => {
    try {
      await api.deleteStudent(token, id);
      Toast.show({ type: 'success', text1: '已删除' });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '删除失败' });
    }
  };

  const handlePickExcel = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream',
          'text/csv',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      const file = await createFormDataFile(asset.uri, asset.name || 'roster.xlsx', asset.mimeType || 'application/octet-stream');
      const fd = new FormData();
      fd.append('file', file as any);
      setLoading(true);
      try {
        const r: any = await api.importFile(token, fd);
        Toast.show({ type: 'success', text1: `导入成功：${r?.imported ?? ''} 人（跳过 ${r?.skipped ?? ''} 人）` });
        load();
      } catch (e: any) {
        Toast.show({ type: 'error', text1: e?.message || '导入失败' });
      } finally {
        setLoading(false);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '选择文件失败' });
    }
  };

  const handlePasteText = async () => {
    if (!pasteText.trim()) return Toast.show({ type: 'error', text1: '请粘贴名单内容' });
    setLoading(true);
    try {
      const r: any = await api.importText(token, pasteText);
      Toast.show({ type: 'success', text1: `导入成功：${r?.imported ?? ''} 人（跳过 ${r?.skipped ?? ''} 人）` });
      setPasteVisible(false);
      setPasteText('');
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '导入失败' });
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    try {
      await api.clearStudents(token);
      Toast.show({ type: 'success', text1: '名单已清空' });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '清空失败' });
    }
  };

  return (
    <Screen>
      <FlatList
        className="bg-cream"
        data={students}
        keyExtractor={(s) => String(s.id)}
        ListHeaderComponent={
          <View>
            <StarryHeader title="班级名单" subtitle={`共 ${students.length} 名学生 · 家长注册时按此名单绑定孩子`} />
            <View className="px-4 pt-4">
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => router.push('/teacher/tasks')}
                  className="bg-cream border border-navydark/20 rounded-2xl px-4 py-3 flex-1 items-center"
                >
                  <Text className="text-navydark text-[13px] font-medium">去发布任务</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="px-5">
            <Empty text="还没有学生名单，请导入或添加" />
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-navydark text-[15px] font-semibold mb-3">导入名单方式</Text>
              <View className="gap-2">
                <NavyButton title="上传 Excel 名单" onPress={handlePickExcel} loading={loading} />
                <NavyButton title="粘贴文本导入（学号,姓名）" onPress={() => setPasteVisible(true)} style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1e3a5f' }} disabled={loading} />
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-4 mb-3">
            <View className="bg-white rounded-2xl px-4 py-3.5 flex-row items-center"
              style={{ shadowColor: '#1e3a5f', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }}>
              <View className="w-9 h-9 rounded-full bg-[#e7edf5] items-center justify-center mr-3">
                <Text className="text-navysoft text-[15px] font-bold">{item.name.slice(0, 1)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-ink text-[15px] font-semibold">{item.name}</Text>
                <Text className="text-ink-muted text-[12px]">学号 {item.student_no}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(item)} className="px-3 py-2">
                <Text className="text-navydark text-[14px]">编辑</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeStudent(item.id)} className="px-2 py-2">
                <Text className="text-[#c0392b] text-[14px]">删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          students.length > 0 ? (
            <View className="px-4 pb-8 gap-2">
              <NavyButton title="＋ 新增学生" onPress={openAdd} loading={loading} />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handlePickExcel}
                  className="flex-1 bg-white border border-navydark/25 rounded-2xl py-3 items-center"
                >
                  <Text className="text-navydark text-[14px] font-medium">上传 Excel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPasteVisible(true)}
                  className="flex-1 bg-white border border-navydark/25 rounded-2xl py-3 items-center"
                >
                  <Text className="text-navydark text-[14px] font-medium">粘贴文本</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearAll} className="flex-1 bg-white border border-[#c0392b]/30 rounded-2xl py-3 items-center">
                  <Text className="text-[#c0392b] text-[14px] font-medium">清空名单</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />

      {/* 新增/编辑弹窗 */}
      <Modal visible={editVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
          <TouchableOpacity className="flex-1 bg-black/30" onPress={() => setEditVisible(false)} />
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <Text className="text-[18px] font-bold text-navydark mb-4">{editing ? '编辑学生' : '新增学生'}</Text>
            <Field label="学号" value={edNo} onChangeText={setEdNo} keyboardType="number-pad" placeholder="如：6" />
            <Field label="姓名" value={edName} onChangeText={setEdName} placeholder="请输入姓名" />
            <NavyButton title="保存" onPress={saveStudent} loading={loading} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 粘贴文本弹窗 */}
      <Modal visible={pasteVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
          <TouchableOpacity className="flex-1 bg-black/30" onPress={() => setPasteVisible(false)} />
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <Text className="text-[18px] font-bold text-navydark mb-1">粘贴文本导入</Text>
            <Text className="text-[12px] text-ink-muted mb-3">
              每行一个学生，学号与姓名之间用 逗号(,) 或 空格 分隔，例如：{'\n'}6, 赵子豪{'\n'}7, 钱思远
            </Text>
            <ScrollView className="max-h-56 bg-[#f7f4ee] rounded-2xl p-3 mb-4">
              <Field label="名单内容" value={pasteText} onChangeText={setPasteText} multiline placeholder={'6, 赵子豪\n7, 钱思远\n...'} />
            </ScrollView>
            <NavyButton title="导入" onPress={handlePasteText} loading={loading} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}