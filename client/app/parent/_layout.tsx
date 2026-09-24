import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

export default function ParentTabLayout() {
  const insets = useSafeAreaInsets();
  const [background, muted, accent, border] = useCSSVariable([
    '--color-background',
    '--color-muted',
    '--color-accent',
    '--color-border',
  ]) as string[];

  let tabBarStyle: any = {
    backgroundColor: background,
    borderTopWidth: 1,
    borderTopColor: border,
  };

  if (Platform.OS === 'web') {
    tabBarStyle = { ...tabBarStyle, height: 'auto' };
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => <FontAwesome6 name="house" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="apply"
        options={{
          title: '申报',
          tabBarIcon: ({ color }) => <FontAwesome6 name="pencil" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: '全班记录',
          tabBarIcon: ({ color }) => <FontAwesome6 name="list" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}