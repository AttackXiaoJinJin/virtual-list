import { useRef } from 'react';
import raf from 'rc-util/lib/raf';
import isFF from '../utils/isFirefox';
import useOriginScroll from './useOriginScroll';
import { useMemoizedFn } from 'ahooks';

interface FireFoxDOMMouseScrollEvent {
  detail: number;
  preventDefault: VoidFunction;
}

export default function useFrameWheel(
  isScrollAtTop: boolean,
  isScrollAtBottom: boolean,
  horizontalScroll: boolean,
  /***
   * Return `true` when you need to prevent default event
   */
  onWheelDelta: (offset: number, horizontal?: boolean) => void,
): [(e: WheelEvent) => void] {

  const offsetRef = useRef(0);
  const nextFrameRef = useRef<number>(null);

  // Firefox patch
  const wheelValueRef = useRef<number>(null);
  const isMouseScrollRef = useRef<boolean>(false);

  // Scroll status sync
  const originScroll = useOriginScroll(isScrollAtTop, isScrollAtBottom);

  const onWheelY=useMemoizedFn((event: WheelEvent, deltaY: number)=> {
    raf.cancel(nextFrameRef.current);

    offsetRef.current += deltaY;
    wheelValueRef.current = deltaY;

    // Do nothing when scroll at the edge, Skip check when is in scroll
    if (originScroll(deltaY)) return;

    event.preventDefault();

    nextFrameRef.current = raf(() => {
      // Patch a multiple for Firefox to fix wheel number too small
      // ref: https://github.com/ant-design/ant-design/issues/26372#issuecomment-679460266
      const patchMultiple = isMouseScrollRef.current ? 10 : 1;
      onWheelDelta(offsetRef.current * patchMultiple);
      offsetRef.current = 0;
    });
  })

  const onWheelX=useMemoizedFn((event: WheelEvent, deltaX: number)=> {
    onWheelDelta(deltaX, true);
    event.preventDefault();
  })

  // Check for which direction does wheel do. `sx` means `shift + wheel`
  // 如果用户用鼠标，他可能会用shift+滚轮来进行横向滚动
  const wheelDirectionRef = useRef<'x' | 'y' | 'sx' | null>(null);
  const wheelDirectionCleanRef = useRef<number>(null);

  const onWheel=useMemoizedFn((event: WheelEvent)=> {

    // Wait for 2 frame to clean direction
    raf.cancel(wheelDirectionCleanRef.current);
    // 合并两帧的滚动
    wheelDirectionCleanRef.current = raf(() => {
      wheelDirectionRef.current = null;
    }, 2);

    const { deltaX, deltaY, shiftKey } = event;
    let mergedDeltaX = deltaX;
    let mergedDeltaY = deltaY;

    if (
      wheelDirectionRef.current === 'sx' ||
      (!wheelDirectionRef.current && (shiftKey || false) && deltaY && !deltaX)
    ) {
      mergedDeltaX = deltaY;
      mergedDeltaY = 0;

      wheelDirectionRef.current = 'sx';
    }

    const absX = Math.abs(mergedDeltaX);
    const absY = Math.abs(mergedDeltaY);

    if (wheelDirectionRef.current === null) {
      wheelDirectionRef.current = horizontalScroll && absX > absY ? 'x' : 'y';
    }

    if (wheelDirectionRef.current === 'y') {
      onWheelY(event, mergedDeltaY);
    } else {
      onWheelX(event, mergedDeltaX);
    }
  })

  return [onWheel];
}
