import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { useAuth } from '@/contexts/AuthContext';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const rootState = useRootNavigationState();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!rootState?.key || isLoading) return;

    const seg = segments.join('/');
    const inAuth = seg === '' || seg === 'index' || seg.startsWith('login') || seg.startsWith('register');

    if (!isAuthenticated) {
      // 未登录：仅允许停留在登录/注册页
      if (!inAuth) router.replace('/');
      return;
    }

    const role = user?.role;
    const ownHome = role === 'teacher' ? '/teacher' : '/parent';

    // 已登录但在登录/注册页 → 去各自首页
    if (inAuth) {
      router.replace(ownHome);
      return;
    }

    // 角色错配 → 回到自己的首页
    if (role === 'teacher' && (seg.startsWith('parent') || seg.startsWith('apply') || seg.startsWith('records'))) {
      router.replace(ownHome);
      return;
    }
    if (role === 'parent' && (seg.startsWith('teacher') || seg.startsWith('tasks') || seg.startsWith('scoring') || seg.startsWith('more'))) {
      router.replace(ownHome);
      return;
    }
  }, [rootState?.key, isAuthenticated, isLoading, user?.role, segments, router]);

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        headerShown: false,
        contentStyle: { backgroundColor: '#f7f4ec' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="teacher" />
      <Stack.Screen name="parent" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider>
      <StatusBar style="light" />
      <RootNavigator />
      <Toast />
    </Provider>
  );
}