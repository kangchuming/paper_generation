import { useCallback, useRef } from 'react';

/**
 * 自定义防抖Hook
 * @param fn 需要防抖的函数
 * @param delay 延迟时间(毫秒)
 * @returns 防抖后的函数
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  // 使用useRef保存定时器，避免重复创建
  const timerRef = useRef<number | null>(null);

  // 使用useCallback缓存防抖函数，避免不必要的重新创建
  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      // 如果存在定时器，清除它
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // 设置新的定时器
      timerRef.current = window.setTimeout(() => {
        fn(...args);
        timerRef.current = null;
      }, delay);
    },
    [fn, delay]
  );

  return debouncedFn;
} 