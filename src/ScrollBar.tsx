import * as React from 'react';
import classNames from 'classnames';
import raf from 'rc-util/lib/raf';
import { useMemoizedFn } from 'ahooks';

export type ScrollBarDirectionType = 'ltr' | 'rtl';

export interface ScrollBarProps {
  prefixCls: string;
  scrollOffset: number;
  scrollRange: number;
  onScroll: (scrollOffset: number, horizontal?: boolean) => void;
  onStartMove: () => void;
  onStopMove: () => void;
  horizontal?: boolean;
  style?: React.CSSProperties;
  thumbStyle?: React.CSSProperties;
  spinSize: number;
  containerSize: number;
}

export interface ScrollBarRef {
  delayHidden: () => void;
}

function getPageXY(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  horizontal: boolean,
) {
  const obj = 'touches' in e ? e.touches[0] : e;
  return obj[horizontal ? 'pageX' : 'pageY'];
}

const ScrollBar = React.forwardRef<ScrollBarRef, ScrollBarProps>((props, ref) => {
  const {
    prefixCls,
    scrollOffset,
    scrollRange,
    onStartMove,
    onStopMove,
    onScroll,
    horizontal,
    spinSize,
    containerSize,
    style,
    thumbStyle: propsThumbStyle,
  } = props;

  const [dragging, setDragging] = React.useState(false);
  const [pageXY, setPageXY] = React.useState<number | null>(null);
  const [startTop, setStartTop] = React.useState<number | null>(null);
  console.log(pageXY,'pageXY52')
  // ========================= Refs =========================
  const scrollbarRef = React.useRef<HTMLDivElement>();
  const thumbRef = React.useRef<HTMLDivElement>();

  // ======================== Range =========================
  const enableScrollRange = scrollRange - containerSize || 0;
  const enableOffsetRange = containerSize - spinSize || 0;

  // ========================= Top ==========================
  const top = React.useMemo(() => {
    if (scrollOffset === 0 || enableScrollRange === 0) {
      return 0;
    }
    const ptg = scrollOffset / enableScrollRange;
    return ptg * enableOffsetRange;
  }, [scrollOffset, enableScrollRange, enableOffsetRange]);

  // ====================== Container =======================
  const onContainerMouseDown: React.MouseEventHandler = e => {
    e.stopPropagation();
    e.preventDefault();
  };

  // ======================== Thumb =========================
  const stateRef = React.useRef({ top, dragging, pageY: pageXY, startTop });
  stateRef.current = { top, dragging, pageY: pageXY, startTop };

  const onThumbMouseDown = useMemoizedFn((e: React.MouseEvent | React.TouchEvent | TouchEvent) => {
    setDragging(true);
    console.log('拖拽滚动条','onThumbMouseDown82')
    setPageXY(getPageXY(e, horizontal));
    setStartTop(stateRef.current.top);

    onStartMove();
    e.stopPropagation();
    e.preventDefault();
  })

  // ======================== Effect ========================

  // React make event as passive, but we need to preventDefault
  // Add event on dom directly instead.
  // ref: https://github.com/facebook/react/issues/9809
  // React.useEffect(() => {
  //   const onScrollbarTouchStart = (e: TouchEvent) => {
  //     e.preventDefault();
  //   };
  //
  //   const scrollbarEle = scrollbarRef.current;
  //   const thumbEle = thumbRef.current;
  //   scrollbarEle.addEventListener('touchstart', onScrollbarTouchStart);
  //   thumbEle.addEventListener('touchstart', onThumbMouseDown);
  //
  //   return () => {
  //     scrollbarEle.removeEventListener('touchstart', onScrollbarTouchStart);
  //     thumbEle.removeEventListener('touchstart', onThumbMouseDown);
  //   };
  // }, [onThumbMouseDown]);

  // Pass to effect
  const enableScrollRangeRef = React.useRef<number>();
  enableScrollRangeRef.current = enableScrollRange;
  const enableOffsetRangeRef = React.useRef<number>();
  enableOffsetRangeRef.current = enableOffsetRange;

  React.useEffect(() => {
    if (dragging) {
      let moveRafId: number;

      const onMouseMove = (e: MouseEvent | TouchEvent) => {
        const {
          dragging: stateDragging,
          /* 鼠标按在滚动条的那一刻，距离文档顶部的距离 */
          pageY: statePageY,
          startTop: stateStartTop,
        } = stateRef.current;
        raf.cancel(moveRafId);

        if (stateDragging) {
          const offset = getPageXY(e, horizontal) - statePageY;
          console.log(offset,)
          let newTop = stateStartTop;

          // if (!isLTR && horizontal) {
          //   newTop -= offset;
          // } else {
            newTop += offset;
          // }

          const tmpEnableScrollRange = enableScrollRangeRef.current;
          const tmpEnableOffsetRange = enableOffsetRangeRef.current;

          const ptg: number = tmpEnableOffsetRange ? newTop / tmpEnableOffsetRange : 0;

          let newScrollTop = Math.ceil(ptg * tmpEnableScrollRange);
          newScrollTop = Math.max(newScrollTop, 0);
          newScrollTop = Math.min(newScrollTop, tmpEnableScrollRange);

          moveRafId = raf(() => {
            onScroll(newScrollTop, horizontal);
          });
        }
      };

      const onMouseUp = () => {
        setDragging(false);

        onStopMove();
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onMouseUp);

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchend', onMouseUp);

        raf.cancel(moveRafId);
      };
    }
  }, [dragging,horizontal,onScroll,onStopMove]);

  // ======================== Render ========================
  const scrollbarPrefixCls = `${prefixCls}-scrollbar`;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    visibility: null,
    border:'1px red solid'
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 99,
    cursor: 'pointer',
    userSelect: 'none',
    border:'1px green solid'
  };

  if (horizontal) {
    // Container
    containerStyle.height = 8;
    containerStyle.left = 0;
    containerStyle.right = 0;
    containerStyle.bottom = 0;

    // Thumb
    thumbStyle.height = '100%';
    thumbStyle.width = spinSize;
    thumbStyle.left = top;
  } else {
    // Container
    containerStyle.width = 8;
    containerStyle.top = 0;
    containerStyle.bottom = 0;
    containerStyle.right = 0;

    // Thumb
    thumbStyle.width = '100%';
    thumbStyle.height = spinSize;
    thumbStyle.top = top;
  }

  return (
    <div
      ref={scrollbarRef}
      className={classNames(scrollbarPrefixCls, {
        [`${scrollbarPrefixCls}-horizontal`]: horizontal,
        [`${scrollbarPrefixCls}-vertical`]: !horizontal,
        [`${scrollbarPrefixCls}-visible`]: true,
      })}
      style={{ ...containerStyle, ...style }}
      onMouseDown={onContainerMouseDown}
    >
      <div
        ref={thumbRef}
        className={classNames(`${scrollbarPrefixCls}-thumb`, {
          [`${scrollbarPrefixCls}-thumb-moving`]: dragging,
        })}
        style={{ ...thumbStyle, ...propsThumbStyle }}
        onMouseDown={onThumbMouseDown}
      />
    </div>
  );
});

export default ScrollBar;
