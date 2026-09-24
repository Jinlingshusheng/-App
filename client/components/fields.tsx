import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  TextInputProps,
  StyleSheet,
} from 'react-native';

/** 藏蓝主按钮 */
export function NavyButton({
  title,
  onPress,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        {
          backgroundColor: isDisabled ? '#9aa7bd' : '#1e3a5f',
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#1e3a5f',
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 3,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-white text-[16px] font-semibold tracking-wide">{title}</Text>
      )}
    </TouchableOpacity>
  );
}

/** 卡片 */
export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: '#ffffff',
          borderRadius: 18,
          padding: 16,
          shadowColor: '#1e3a5f',
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; hint?: string };

/** 带标签的输入框 */
export function Field({ label, hint, ...props }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-[13px] font-medium text-ink-muted mb-1.5">{label}</Text>
      <View className="bg-[#f3f0e9] rounded-2xl px-4 py-0.5">
        <TextInput
          placeholderTextColor="#a9a49a"
          className="text-[16px] text-ink py-3"
          selectionColor="#1e3a5f"
          {...props}
        />
      </View>
      {hint ? <Text className="text-[12px] text-ink-muted mt-1">{hint}</Text> : null}
    </View>
  );
}

/** 分段选择 */
export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <View className="flex-row bg-[#ebe7dd] rounded-full p-1 mb-5">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{ flex: 1 }}
            className={
              active
                ? 'bg-white rounded-full py-2.5 items-center shadow-sm'
                : 'py-2.5 items-center'
            }
          >
            <Text
              className={
                active ? 'text-navydark text-[14px] font-semibold' : 'text-ink-muted text-[14px]'
              }
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** 星级小文字标签 */
export function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <View
      className={
        gold
          ? 'bg-[#fbf3dd] rounded-full px-2.5 py-1 self-start'
          : 'bg-[#e7edf5] rounded-full px-2.5 py-1 self-start'
      }
    >
      <Text className={gold ? 'text-gold-dark text-[12px] font-semibold' : 'text-navysoft text-[12px] font-semibold'}>
        {children}
      </Text>
    </View>
  );
}

/** 空态 */
export function Empty({ text }: { text: string }) {
  return (
    <View className="items-center py-14">
      <Text className="text-[32px] mb-2">★</Text>
      <Text className="text-ink-muted text-[14px]">{text}</Text>
    </View>
  );
}

export const shadow = StyleSheet.create({
  soft: {
    shadowColor: '#1e3a5f',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});