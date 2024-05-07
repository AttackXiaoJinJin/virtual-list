import * as React from 'react';
import { useRef, useEffect } from 'react';
import findDOMNode from 'rc-util/lib/Dom/findDOMNode';
import raf from 'rc-util/lib/raf';
import type { GetKey } from '../interface';
import CacheMap from '../utils/CacheMap';
import { useMemoizedFn } from 'ahooks';

export default function useHeights<T>(
  getKey: GetKey<T>,
): [
  setInstanceRef: (item: T, instance: HTMLElement) => void,
  collectHeight: (sync?: boolean) => void,
  cacheMap: CacheMap,
  heightUpdatedMark: number,
] {
  const [heightUpdatedMark, setUpdatedMark] = React.useState(0);
  const instanceRef = useRef(new Map<React.Key, HTMLElement>());
  const heightsRef = useRef(new CacheMap());
  const collectRafRef = useRef<number>();


  function cancelRaf() {
    raf.cancel(collectRafRef.current);
  }

  // sync同步
  // 缓存每个viewElement的高度
  /* 这个是在requestAnimationFrame内缓存viewport内所有的item高度 */
  // 在requestAnimateFrame中更新rendered items高度
  const collectHeight=useMemoizedFn((sync = false)=> {
    cancelRaf();
    // 已渲染数据dom的高度
    const doCollect = () => {
      instanceRef.current.forEach((element, key) => {
        if (element && element.offsetParent) {
          const htmlElement = findDOMNode<HTMLElement>(element);
          const { offsetHeight } = htmlElement;
          if (heightsRef.current.get(key) !== offsetHeight) {
            heightsRef.current.set(key, offsetHeight);
          }
        }
      });

      // 当resized时需要通知父组件强制更新以重新计算高度
      setUpdatedMark((c) => c + 1);
    };

    if (sync) {
      doCollect();
    } else {
      collectRafRef.current = raf(doCollect);
    }
  })

  const setInstanceRef=useMemoizedFn((item: T, instance: HTMLElement)=> {
    const key = getKey(item);
    if (instance) {
      instanceRef.current.set(key, instance);
      collectHeight();
    } else {
      instanceRef.current.delete(key);
    }
  })

  useEffect(() => {
    return ()=>{
      cancelRaf()
    };
  }, []);

  return [setInstanceRef, collectHeight, heightsRef.current, heightUpdatedMark];
}
