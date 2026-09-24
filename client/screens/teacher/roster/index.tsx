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

  // 一键清除确认弹窗
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);

  // 查看学生报名弹窗
  const [subVisible, setSubVisible] = useState(false);
  const [subs, setSubs] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subTaskName, setSubTaskName] = useState('');

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
    setLoading(true);
    try {
      await api.clearStudents(token);
      Toast.show({ type: 'success', text1: '名单已清空' });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '清空失败' });
    } finally {
      setLoading(false);
    }
  };

  // 打开一键清除确认弹窗
  const openClearConfirm = () => setConfirmClearVisible(true);

  // 加载并展示所有学生报名内容
  const openSubs = async () => {
    setSubLoading(true);
    try {
      const { task } = await api.getActiveTask(token);
      if (!task) {
        setSubs([]);
        setSubTaskName('');
        setSubVisible(true);
        return;
      }
      const { submissions } = await api.getSubmissions(token, task.id);
      setSubs(submissions || []);
      setSubTaskName(task.name || '');
      setSubVisible(true);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '加载报名内容失败' });
    } finally {
      setSubLoading(false);
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
              <View className="flex-row gap-2 mb-2">
                <TouchableOpacity
                  onPress={() => router.push('/teacher/tasks')}
                  className="bg-cream border border-navydark/20 rounded-2xl px-4 py-3 flex-1 items-center"
                >
                  <Text className="text-navydark text-[13px] font-medium">去发布任务</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={openSubs}
                  className="flex-1 bg-navydark rounded-2xl px-4 py-3 items-center"
                >
                  <Text className="text-gold text-[13px] font-semibold">查看学生报名</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={openClearConfirm}
                  className="flex-1 bg-white border border-[#c0392b]/40 rounded-2xl px-4 py-3 items-center"
                >
                  <Text className="text-[#c0392b] text-[13px] font-medium">一键清除学生</Text>
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
                <TouchableOpacity onPress={openClearConfirm} className="flex-1 bg-white border border-[#c0392b]/30 rounded-2xl py-3 items-center">
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

      {/* 一键清除确认弹窗 */}
      <Modal visible={confirmClearVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="w-full max-w-sm bg-white rounded-3xl p-6">
            <Text className="text-[18px] font-bold text-navydark text-center mb-2">一键清除学生</Text>
            <Text className="text-[13px] text-ink-muted text-center leading-5 mb-5">
              确定要清除全部 {students.length} 名学生吗？{'\n'}清除后名单、绑定关系及报名、打分记录将一并删除，且无法恢复。
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmClearVisible(false)}
                className="flex-1 bg-[#f1eeea] rounded-2xl py-3 items-center"
              >
                <Text className="text-ink text-[14px] font-medium">取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setConfirmClearVisible(false); clearAll(); }}
                className="flex-1 bg-[#c0392b] rounded-2xl py-3 items-center"
              >
                <Text className="text-white text-[14px] font-semibold">确认清除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 查看学生报名弹窗 */}
      <Modal visible={subVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
          <TouchableOpacity className="flex-1 bg-black/30" onPress={() => setSubVisible(false)} />
          <View className="bg-white rounded-t-3xl p-5 pb-8 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[18px] font-bold text-navydark">学生报名内容</Text>
              <TouchableOpacity onPress={() => setSubVisible(false)} className="px-2 py-1">
                <Text className="text-ink-muted text-[18px]">✕</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-[12px] text-ink-muted mb-3">
              {subTaskName ? `任务：${subTaskName}` : '当前没有进行中的任务'}
            </Text>
            {subLoading ? (
              <View className="py-10 items-center">
                <Text className="text-ink-muted">加载中…</Text>
              </View>
            ) : subs.length === 0 ? (
              <View className="py-10 items-center">
                <Text className="text-ink-muted">暂无学生报名</Text>
              </View>
            ) : (
              <ScrollView className="max-h-[68%]">
                <View className="gap-2">
                  {subs.map((s: any) => {
                    const scored = s.total != null || s.content != null;
                    return (
                      <View key={s.id} className="bg-[#f7f4ee] rounded-2xl p-3.5">
                        <View className="flex-row items-center justify-between mb-1">
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-[#e7edf5] items-center justify-center mr-2">
                              <Text className="text-navydark text-[12px] font-bold">{(s.student_name || '?').slice(0, 1)}</Text>
                            </View>
                            <Text className="text-ink text-[14px] font-semibold">{s.student_name || '未知'}</Text>
                            <Text className="text-ink-muted text-[11px] ml-2">学号 {s.student_no ?? '--'}</Text>
                          </View>
                          {s.best_star ? (
                            <Text className="text-gold-dark text-[12px] font-bold">★ 最佳</Text>
                          ) : scored ? (
                            <Text className="text-[#0f766e] text-[12px] font-medium">已打分</Text>
                          ) : (
                            <Text className="text-ink-muted text-[12px]">未打分</Text>
                          )}
                        </View>
                        <Text className="text-[13px] text-ink leading-5">主题：{s.theme || '--'}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}