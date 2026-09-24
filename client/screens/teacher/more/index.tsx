import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { api, API_BASE, downloadBlob, getShareInfo } from '@/utils/api';
import { NavyButton, Field, Card } from '@/components/fields';
import { StarryHeader } from '@/components/stars/StarryHeader';
import Toast from 'react-native-toast-message';

export default function MoreScreen() {
  const { token, user, logout } = useAuth();
  const router = useSafeRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [pwModal, setPwModal] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { tasks: list } = await api.getTasks(token);
      setTasks([...list].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0)));
    } catch { /* ignore */ }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const exportExcel = async (t: any) => {
    try {
      const res = await api.exportTask(token, t.id, t.name);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `导出失败(${res.status})`);
      }
      await downloadBlob(res, `${t.name}-打分记录.xlsx`);
      Toast.show({ type: 'success', text1: '已导出 Excel' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '导出失败' });
    }
  };

  const copyShare = async () => {
    const { copy } = getShareInfo();
    await Clipboard.setStringAsync(copy);
    Toast.show({ type: 'success', text1: '分享文案已复制，可前往微信群/QQ群粘贴' });
  };

  const changePw = async () => {
    if (!oldPw || !newPw) return Toast.show({ type: 'error', text1: '请填写原密码和新密码' });
    if (!/^[a-z0-9]{8,20}$/i.test(newPw)) return Toast.show({ type: 'error', text1: '新密码需8位以上字母或数字' });
    setSaving(true);
    try {
      await api.changePassword(token, { old_password: oldPw, new_password: newPw });
      Toast.show({ type: 'success', text1: '密码修改成功，请牢记' });
      setPwModal(false);
      setOldPw('');
      setNewPw('');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message || '修改失败' });
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    await logout();
    router.replace('/');
  };

  const activeTasks = tasks.filter((t) => t.is_active);
  const exportTarget = activeTasks[0] ?? tasks[0];

  return (
    <Screen>
      <View className="flex-1 bg-cream">
        <StarryHeader title="导出 · 分享 · 设置" subtitle="一键导出打分记录，转发报名链接给家长" />
        <View className="p-4 gap-3">
          <Card>
            <Text className="text-navydark text-[15px] font-bold mb-1">数据导出（Excel）</Text>
            {exportTarget ? (
              <Text className="text-ink-muted text-[13px] mb-3">当前任务：{exportTarget.name}</Text>
            ) : (
              <Text className="text-ink-muted text-[13px] mb-3">请先在「任务」中创建任务</Text>
            )}
            <NavyButton title="导出当前任务打分记录" onPress={() => exportTarget && exportExcel(exportTarget)}
              disabled={!exportTarget} loading={saving} />
          </Card>

          <Card>
            <Text className="text-navydark text-[15px] font-bold mb-1">分享报名</Text>
            <Text className="text-ink-muted text-[13px] mb-1">一键复制含报名链接的分享文案，转发到微信群、QQ群，家长点开即可注册申报。</Text>
            <Text className="text-[12px] text-[#c0392b] mb-3">提示：请先将本页面部署到公网/手机可访问的地址后再分享。</Text>
            <NavyButton title="复制分享文案" onPress={copyShare} />
          </Card>

          <Card>
            <Text className="text-navydark text-[15px] font-bold mb-3">账户与安全</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-ink text-[14px] font-medium">{user?.name || user?.username}</Text>
                <Text className="text-ink-muted text-[12px]">
                  {user?.role === 'teacher' ? '教师' : '家长'} 账号
                </Text>
              </View>
            </View>
            {user?.role === 'teacher' ? (
              <Text className="text-[12px] text-ink-muted mt-2 mb-3">
                当前为教师账号，建议尽快修改初始密码：WX
              </Text>
            ) : (
              <Text className="text-[12px] text-ink-muted mt-2 mb-3">一个家长账号仅绑定一名孩子</Text>
            )}
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setPwModal(true)} className="flex-1 bg-white border border-navydark/25 rounded-xl py-3 items-center">
                <Text className="text-navydark text-[14px] font-medium">修改密码</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doLogout} className="flex-1 bg-white border border-[#c0392b]/30 rounded-xl py-3 items-center">
                <Text className="text-[#c0392b] text-[14px] font-medium">退出登录</Text>
              </TouchableOpacity>
            </View>
          </Card>

          <Text className="text-center text-ink-muted text-[12px] mt-2">
            数据实时同步 · 支持手机 / 电脑多端访问
          </Text>
        </View>
      </View>

      <Modal visible={pwModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
          <TouchableOpacity className="flex-1 bg-black/30" onPress={() => setPwModal(false)} />
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <Text className="text-[18px] font-bold text-navydark mb-4">修改密码</Text>
            <Field label="原密码" value={oldPw} onChangeText={setOldPw} secureTextEntry placeholder="请输入当前密码" />
            <Field label="新密码" value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="8位以上字母或数字" />
            <NavyButton title="确认修改" onPress={changePw} loading={saving} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}