import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface StarProps {
  filled?: boolean;
  onPress?: () => void;
  size?: number;
}

/**
 * 星光金最佳星标：点亮时弹簧放大 + 高亮，未点亮为浅色待命。
 */
export function Star({ filled = false, onPress, size = 26 }: StarProps) {
  const scale = useSharedValue(filled ? 1 : 0.72);

  useEffect(() => {
    scale.value = withSpring(filled ? 1 : 0.72, { damping: 7, stiffness: 220 });
  }, [filled, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const color = filled ? '#d6a631' : onPress ? '#c0a86a' : '#d9d3c2';

  return (
    <Animated.View style={style}>
      <Pressable onPress={onPress} disabled={!onPress} hitSlop={10} accessibilityLabel="最佳星标">
        <FontAwesome6 name="star" solid={filled} size={size} color={color} />
      </Pressable>
    </Animated.View>
  );
}